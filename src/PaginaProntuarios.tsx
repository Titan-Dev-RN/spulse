import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, Image, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert, Linking, ScrollView, Button, PermissionsAndroid, Platform } from 'react-native';
import { supabase } from '../services/supabase';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import tw from 'tailwind-react-native-classnames';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { fetchVisitors } from './EditarProntuarios';
import Icon from 'react-native-vector-icons/Ionicons'; // Importando Ionicons
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserContext } from './UserContext';



const PageGeral = ({ currentLatitude, currentLongitude, contextCurrentUser }) => {
    const [visitorList, setVisitorList] = useState([]);
    const [selectedProntuario, setSelectedProntuario] = useState(null);
    const [mapModalVisible, setMapModalVisible] = useState(false);
    const [mapCoordinates, setMapCoordinates] = useState({ latitude: null, longitude: null });
    const [expandedVisitorIdCheck, setExpandedVisitorIdCheck] = useState(null);
    const [expandedVisitorId, setExpandedVisitorId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [checkpoints, setCheckpoints] = useState({});
    const [nfcWriting, setNfcWriting] = useState(false);
    const [nfcReading, setNfcReading] = useState(false);
    const [userPavilion, setUserPavilion] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentUserName, setCurrentUserName] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showPopup, setShowPopup] = useState(false); // Controla a visibilidade do modal
    const [link, setLink] = useState(''); // Estado para armazenar o link lido

    const itemsPerPage = 15;
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const { logoutUser } = useUserContext();
    


    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                callLocation();
                await fetchVisitors();
                await loadVisitors();
                
                const pavilion = await fetchUserPavilion();
                setUserPavilion(pavilion);
                await fetchCurrentUser();
                
            } catch (error) {
                console.error('Erro no loadData:', error);
            } finally {
                setLoading(false);
            }
        };
    
        loadData();
        //loadVisitors();

        // Função para lidar com deep links
        const handleDeepLink = (event) => {
            const link = event.url;
            //console.log('Deep link recebido:', link);
            const prontuarioId = link.split('/').pop();
            
            if (prontuarioId) {
                navigateToProntuarioScreen(prontuarioId);
            } else {
                console.warn('ID do prontuário não encontrado na URL.');
            }
        };
    
        // Adicionando listener para deep link
        const linkingListener = Linking.addListener('url', handleDeepLink);
        console.log('Pavilhão do usuário:', userPavilion, typeof userPavilion);
        // Cleanup ao desmontar o componente
        return () => {
            linkingListener.remove(); // Remover o listener corretamente
        };
        
    }, []);

    // Carrega os visitantes quando a tela é focada
    useEffect(() => {
        if (isFocused) {
            loadVisitors();
        }
    }, [isFocused]);
     
    const readTag = async () => {
        try {
            setNfcReading(true);
            await NfcManager.requestTechnology(NfcTech.Ndef);

            const tag = await NfcManager.getTag();
            console.log('Tag lida:', tag);

            if (tag.ndefMessage && tag.ndefMessage.length > 0) {
                const record = tag.ndefMessage[0];
                let decodedText = '';

                if (record.tnf === Ndef.TNF_WELL_KNOWN && record.type[0] === 0x55) {
                    // Decodificar URI (deep link)
                    decodedText = Ndef.uri.decodePayload(record.payload);
                }

                if (decodedText) {
                    setLink(decodedText); // Armazena o link no estado
                    setShowPopup(true); // Exibe o modal com o link (opcional)

                    // Extrair o ID do prontuário do deep link e navegar
                    const prontuarioId = decodedText.split('/').pop();
                    navigateToProntuarioScreen(prontuarioId);
                } else {
                    Alert.alert('Erro', 'Nenhum link válido encontrado na tag.');
                }
            } else {
                Alert.alert('Erro', 'Nenhuma mensagem NDEF encontrada na tag.');
            }
        } catch (ex) {
            console.warn('Erro ao ler a tag:', ex);
            Alert.alert('Erro', 'Falha ao ler a tag NFC.');
        } finally {
            await NfcManager.cancelTechnologyRequest();
            setNfcReading(false);
        }
    };

    const writeNfc = async () => {
        try {
            if (!selectedProntuario) {
                Alert.alert('Erro', 'Nenhum prontuário selecionado.');
                return;
            }

            setNfcWriting(true);
            await NfcManager.requestTechnology(NfcTech.Ndef);

            // Deep link para o prontuário
            const prontuarioId = selectedProntuario.id;
            const deepLink = `meuapp://prontuario/${prontuarioId}`;

            // Codificar o deep link em uma mensagem NDEF
            const bytes = Ndef.encodeMessage([Ndef.uriRecord(deepLink)]);

            if (bytes) {
                await NfcManager.ndefHandler.writeNdefMessage(bytes);
                Alert.alert('Sucesso', 'O visitante foi gravado no chip NFC!');
            } else {
                Alert.alert('Erro', 'Falha ao codificar a mensagem NDEF.');
            }
        } catch (ex) {
            console.warn(ex);
            //Alert.alert('Erro', 'Falha ao gravar o deep link no chip NFC.');
        } finally {
            await NfcManager.cancelTechnologyRequest();
            setNfcWriting(false);
        }
    };

    // ----------------- FUNÇÕES -----------------
    const loadVisitors = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('visitors').select('*');
            if (error) throw error;
            setVisitorList(data || []);
            setCurrentPage(1);
        } catch (error) {
            console.error('Erro ao buscar visitantes:', error);
            Alert.alert('Erro', 'Não foi possível buscar os registros de visitantes.');
        } finally {
            setLoading(false);
        }
    };

    const fetchCurrentUser = async () => {
        try {
            const email = await AsyncStorage.getItem('currentUser');
            if (!email) return;
            setCurrentUser(email);
            const { data, error } = await supabase.from('usersSpulse').select('name').eq('email', email).single();
            if (error) console.warn('Erro ao buscar nome do usuário:', error);
            else setCurrentUserName(data?.name);
        } catch (error) {
            console.error('Erro ao buscar usuário atual:', error);
        }
    };

    const fetchUserPavilion = async () => {
        try {
            const email = await AsyncStorage.getItem('currentUser');
            if (!email) return null;
            const { data, error } = await supabase
                .from('agent_checkpoints')
                .select('pavilion')
                .eq('user_email', email)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (error) throw error;
            return data?.pavilion || null;
        } catch (error) {
            console.error('Erro ao buscar pavilhão do usuário:', error);
            return null;
        }
    };

    const toggleDetails = async (visitorId) => {
        if (expandedVisitorId === visitorId) {
            setExpandedVisitorId(null);
        } else {
            setExpandedVisitorId(visitorId);
            // Carrega os checkpoints quando expande
            const checkpointsData = await getCheckpoints(visitorId);
            setCheckpoints(prev => ({ ...prev, [visitorId]: checkpointsData }));
        }
    };

    const toggleCheckpoints = async (visitorId) => {
        if (expandedVisitorIdCheck === visitorId) {
            setExpandedVisitorIdCheck(null);
        } else {
            setExpandedVisitorIdCheck(visitorId);
            try {
                setLoading(true);
                const checkpointsData = await getCheckpoints(visitorId);
                setCheckpoints(prev => ({ 
                    ...prev, 
                    [visitorId]: checkpointsData 
                }));
            } catch (error) {
                console.error('Erro ao carregar checkpoints:', error);
            } finally {
                setLoading(false);
            }
        }
    };


    const getCheckpoints = async (visitorId) => {
        if (!visitorId) return [];
        try {
            const { data, error } = await supabase.from('visitor_checkpoints').select('*').eq('visitor_id', visitorId);
            if (error) throw error;
            
            return data.map(c => {
                // Usar o campo time (timestamptz) como prioridade, fallback para created_at
                const timestamp = c.time || c.created_at;
                const dateObj = new Date(timestamp);
                
                // Verificar se a data é válida
                if (isNaN(dateObj.getTime())) {
                    console.warn('Data inválida:', timestamp);
                    return {
                        pavilion: c.pavilion || 'Pavilhão desconhecido',
                        time: 'Horário inválido',
                        date_day: 'Data inválida',
                        fullTime: timestamp
                    };
                }
                
                return {
                    pavilion: c.pavilion || 'Pavilhão desconhecido',
                    time: dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    date_day: dateObj.toLocaleDateString('pt-BR'),
                    fullTime: timestamp
                };
            });
        } catch (error) {
            console.error('Erro ao processar checkpoints:', error);
            return [];
        }
    };
      
    const openMapModal = (latitude, longitude) => {
        if (!latitude || !longitude) {
            Alert.alert('Atenção', 'Localização não disponível');
            return;
        }
        setMapCoordinates({ latitude, longitude });
        setMapModalVisible(true);
    };

    const openMap = () => {
        const { latitude, longitude } = mapCoordinates;
        if (latitude && longitude) {
            const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
            Linking.openURL(url).catch(err => {
                console.error('Erro ao abrir mapa:', err);
                Alert.alert('Erro', 'Não foi possível abrir o aplicativo de mapas');
            });
        }
        setMapModalVisible(false);
    };
      

    const selectProntuario = async (prontuario) => {
        if (!prontuario?.id) return Alert.alert('Erro', 'ID do prontuário inválido.');
        setLoading(true);
        try {
            setSelectedProntuario(prontuario);
            const { data, error } = await supabase.from('visitors').select('*').eq('id', prontuario.id);
            if (error) throw error;
            if (data?.length > 0) setSelectedProntuario(data[0]);
            else Alert.alert('Erro', 'Prontuário não encontrado.');
        } catch (error) {
            console.error('Erro ao selecionar visitante:', error);
            Alert.alert('Erro', 'Falha ao selecionar o visitante.');
        } finally {
            setLoading(false);
        }
    };
    

    const navigateToProntuarioScreen = (prontuarioId) => {
        console.log('ID enviado para navegação:', prontuarioId);
    
        if (prontuarioId) {
            navigation.navigate('ProntuarioScreen', { id: prontuarioId });
        } else {
            Alert.alert('Erro', 'ID do prontuário não encontrado.');
        }
    };


    // Funções de paginação
    const totalPages = Math.ceil(visitorList.length / itemsPerPage);
    const handleNextPage = () => setCurrentPage(currentPage < totalPages ? currentPage + 1 : currentPage);
    const handlePreviousPage = () => setCurrentPage(currentPage > 1 ? currentPage - 1 : currentPage);

    // Determina os itens da página atual
    const currentVisitors = visitorList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


    return (
        <View style={tw`flex-1 bg-gray-50 p-6`}>
            {/* Header */}
            <View style={tw`mb-6`}>
                <Text style={tw`text-2xl font-bold text-gray-800`}>Gestão de Visitantes</Text>
                <Text style={tw`text-gray-500`}>Visualize e gerencie os visitantes registrados</Text>
                
                {/* Botão de atualização manual */}
                <TouchableOpacity 
                    onPress={loadVisitors}
                    style={tw`absolute right-0 top-0 p-2`}
                >
                    <Icon name="refresh" size={24} color="#3B82F6" />
                </TouchableOpacity>
            </View>

            {/* Checkpoints Button */}

            {userPavilion && (
                userPavilion.toString() !== '1' || 
                userPavilion !== 1 || 
                userPavilion !== '1'
            ) && (
                <TouchableOpacity 
                    onPress={() => navigation.navigate('MarcarCheckpoints')}
                    style={tw`bg-blue-600 flex-row items-center rounded-xl p-4 mb-2 shadow-md`}
                >
                    <Icon name="checkmark-circle" size={24} color="white" style={tw`mr-3`} />
                    <View>
                        <Text style={tw`text-lg font-bold text-white`}>Checkpoints</Text>
                        <Text style={tw`text-white opacity-90`}>Registrar passagens pelos blocos.</Text>
                    </View>
                    <Icon name="chevron-forward" size={20} color="white" style={tw`ml-auto`} />
                </TouchableOpacity>
            )}

            {/* Visitors Table */}
            <View style={tw`flex-1 mb-6 bg-white rounded-xl shadow-md overflow-hidden`}>
                
                {/* Table Header */}
                <View style={tw`flex-row bg-gray-100 p-4 border-b border-gray-200`}>
                    <Text style={tw`flex-1 text-gray-700 font-bold`}>Nome</Text>
                    <Text style={tw`w-32 text-right text-gray-700 font-bold`}>Ações</Text>
                </View>

                {/* Table Body */}
                <ScrollView style={tw`flex-1`}>
                    {currentVisitors.length === 0 && (
                        <View style={tw`p-8 items-center`}>
                            <Icon name="people-outline" size={48} color="#D1D5DB" />
                            <Text style={tw`text-gray-400 mt-4`}>Nenhum visitante registrado</Text>
                        </View>
                    )}
                    {currentVisitors.length > 0 ? (
                        currentVisitors.map((visitor) => (
                            <View key={visitor.id} style={tw`border-b border-gray-100`}>
                                {/* Main Row */}
                                <View style={tw`flex-row items-center p-4`}>
                                    <Text style={tw`flex-1 text-gray-800 font-medium`}>
                                        {visitor.name}
                                    </Text>
                                    <View style={tw`flex-row w-32 justify-end`}>
                                        <TouchableOpacity
                                            onPress={() => toggleDetails(visitor.id)}
                                            style={tw`ml-2`}
                                        >
                                            <Icon 
                                                name={expandedVisitorId === visitor.id ? "chevron-up" : "information-circle"} 
                                                size={24} 
                                                color={expandedVisitorId === visitor.id ? "#3B82F6" : "#6B7280"} 
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => toggleCheckpoints(visitor.id)}
                                            style={tw`ml-2`}
                                        >
                                            <Icon 
                                                name={expandedVisitorIdCheck === visitor.id ? "chevron-up" : "location"} 
                                                size={24} 
                                                color={expandedVisitorIdCheck === visitor.id ? "#F59E0B" : "#6B7280"} 
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Visitor Details */}
                                {expandedVisitorId === visitor.id && (
                                    <View style={tw`bg-blue-50 p-4`}>
                                        {/* Image with fallback */}
                                        {visitor.image_url ? (
                                            <Image 
                                                source={{ uri: visitor.image_url }} 
                                                style={tw`w-full h-48 rounded-lg mb-4`}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View style={tw`w-full h-48 bg-gray-200 rounded-lg mb-4 justify-center items-center`}>
                                                <Icon name="person" size={48} color="#9CA3AF" />
                                                <Text style={tw`text-gray-500 mt-2`}>Sem imagem</Text>
                                            </View>
                                        )}
                                        <View style={tw`mb-3`}>
                                            <Text style={tw`text-xs text-gray-500`}>Idade</Text>
                                            <Text style={tw`text-gray-700`}>{visitor.age}</Text>
                                        </View>
                                        <View style={tw`mb-3`}>
                                            <Text style={tw`text-xs text-gray-500`}>Registrado por</Text>
                                            <Text style={tw`text-gray-700`}>{visitor.registered_by}</Text>
                                        </View>
                                        <View style={tw`flex-row mb-4`}>
                                            <View style={tw`flex-1`}>
                                                <Text style={tw`text-xs text-gray-500`}>CPF</Text>
                                                <Text style={tw`text-gray-700`}>{visitor.cpf}</Text>
                                            </View>
                                            <View style={tw`flex-1`}>
                                                <Text style={tw`text-xs text-gray-500`}>RG</Text>
                                                <Text style={tw`text-gray-700`}>{visitor.rg}</Text>
                                            </View>
                                        </View>

                                        <View style={tw`flex-row`}>
                                            <TouchableOpacity
                                                onPress={() => openMapModal(visitor.latitude, visitor.longitude)}
                                                style={tw`flex-1 bg-blue-600 rounded-lg p-3 mr-2 items-center`}
                                            >
                                                <Text style={tw`text-white font-medium`}>Ver no Mapa</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => selectProntuario(visitor)}
                                                style={tw`flex-1 ${selectedProntuario?.id === visitor.id ? 'bg-green-600' : 'bg-gray-200'} rounded-lg p-3 items-center`}
                                            >
                                                <Text style={tw`${selectedProntuario?.id === visitor.id ? 'text-white' : 'text-gray-700'} font-medium`}>
                                                    {loading && selectedProntuario?.id === visitor.id ? (
                                                         <ActivityIndicator color="white" />
                                                    ) : selectedProntuario?.id === visitor.id ? (
                                                        'Selecionado'
                                                    ) : (
                                                        'Selecionar'
                                                    )}
                                                </Text>
                                            </TouchableOpacity>

                                        </View>
                                    </View>
                                )}

                                {/* Checkpoints Section */}
                                {expandedVisitorIdCheck === visitor.id && (
                                    <View style={tw`bg-green-50 p-4 border-t border-green-200`}>
                                        <View style={tw`flex-row justify-between items-center mb-3`}>
                                            <Text style={tw`text-lg font-bold text-gray-800`}>Histórico de Pavilhões</Text>
                                            <View style={tw`flex-row items-center`}>
                                                <Icon name="time" size={16} color="#6366F1" style={tw`mr-1`} />
                                                <Text style={tw`text-sm text-gray-600`}>
                                                    {checkpoints[visitor.id]?.length || 0} registro(s)
                                                </Text>
                                            </View>
                                        </View>
                                        
                                        {checkpoints[visitor.id] && checkpoints[visitor.id].length > 0 ? (
                                            <View style={tw`bg-white rounded-lg border border-gray-200`}>
                                                {checkpoints[visitor.id].map((checkpoint, index) => (
                                                    <View 
                                                        key={`${checkpoint.visitor_id}-${index}`} 
                                                        style={tw`flex-row justify-between items-center p-3 ${
                                                            index !== checkpoints[visitor.id].length - 1 ? 'border-b border-gray-100' : ''
                                                        }`}
                                                    >
                                                        <View style={tw`flex-1`}>
                                                            <View style={tw`flex-row items-center mb-1`}>
                                                                <Icon 
                                                                    name="business" 
                                                                    size={14} 
                                                                    color="#3B82F6" 
                                                                    style={tw`mr-2`} 
                                                                />
                                                                <Text style={tw`font-semibold text-gray-800`}>
                                                                    {checkpoint.pavilion}
                                                                </Text>
                                                            </View>
                                                            
                                                            <View style={tw`flex-row items-center`}>
                                                                <Icon 
                                                                    name="calendar" 
                                                                    size={12} 
                                                                    color="#6B7280" 
                                                                    style={tw`mr-2`} 
                                                                />
                                                                <Text style={tw`text-xs text-gray-600`}>
                                                                    {checkpoint.date_day}
                                                                </Text>
                                                                
                                                                <Icon 
                                                                    name="time" 
                                                                    size={12} 
                                                                    color="#6B7280" 
                                                                    style={tw`ml-3 mr-2`} 
                                                                />
                                                                <Text style={tw`text-xs text-gray-600`}>
                                                                    {checkpoint.time}
                                                                </Text>
                                                            </View>
                                                            
                                                            {checkpoint.registered_by && (
                                                                <View style={tw`flex-row items-center mt-1`}>
                                                                    <Icon 
                                                                        name="person" 
                                                                        size={12} 
                                                                        color="#8B5CF6" 
                                                                        style={tw`mr-2`} 
                                                                    />
                                                                    <Text style={tw`text-xs text-purple-600`}>
                                                                        Por: {checkpoint.registered_by}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        
                                                        <View style={tw`bg-green-100 px-2 py-1 rounded-full`}>
                                                            <Text style={tw`text-xs text-green-800 font-medium`}>
                                                                #{index + 1}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                ))}
                                                
                                                {/* Resumo */}
                                                <View style={tw`bg-gray-50 p-3 border-t border-gray-200`}>
                                                    <Text style={tw`text-sm text-gray-700 text-center`}>
                                                        Primeiro registro: {checkpoints[visitor.id][checkpoints[visitor.id].length - 1]?.date_day} • 
                                                        Último: {checkpoints[visitor.id][0]?.date_day}
                                                    </Text>
                                                </View>
                                            </View>
                                        ) : (
                                            <View style={tw`bg-white rounded-lg border border-gray-200 p-6 items-center`}>
                                                <Icon name="walk" size={32} color="#9CA3AF" />
                                                <Text style={tw`text-gray-500 mt-2 text-center`}>
                                                    Nenhum checkpoint registrado
                                                </Text>
                                                <Text style={tw`text-gray-400 text-xs mt-1 text-center`}>
                                                    Este visitante ainda não passou por nenhum pavilhão
                                                </Text>
                                            </View>
                                        )}
                                        


                                        {/* Botão de ação 
                                        <TouchableOpacity 
                                            style={tw`bg-red-500 mt-3 p-3 rounded-lg flex-row items-center justify-center`}
                                            onPress={() => navigation.navigate('MarcarCheckpoints', { visitorId: visitor.id })}
                                        >
                                            <Icon name="add-circle" size={18} color="white" style={tw`mr-2`} />
                                            <Text style={tw`text-white font-medium`}>
                                                Registrar Novo Checkpoint
                                            </Text>
                                        </TouchableOpacity>
                                        */}


                                    </View>
                                )}
                            </View>
                        ))
                    ) : (
                        <View style={tw`p-8 items-center`}>
                            <Icon name="people-outline" size={48} color="#D1D5DB" />
                            <Text style={tw`text-gray-400 mt-4`}>Nenhum visitante registrado</Text>
                        </View>
                    )}
                </ScrollView>

                {/* Pagination */}
                {visitorList.length > itemsPerPage && (
                    <View style={tw`flex-row justify-between items-center p-3 bg-gray-50 border-t border-gray-200`}>
                        <TouchableOpacity 
                            onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            style={tw`p-2 ${currentPage === 1 ? 'opacity-50' : ''}`}
                        >
                            <Icon name="chevron-back" size={20} color={currentPage === 1 ? "#9CA3AF" : "#3B82F6"} />
                        </TouchableOpacity>
                        
                        <Text style={tw`text-gray-700`}>
                            Página {currentPage} de {totalPages}
                        </Text>
                        
                        <TouchableOpacity 
                            onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            style={tw`p-2 ${currentPage === totalPages ? 'opacity-50' : ''}`}
                        >
                            <Icon name="chevron-forward" size={20} color={currentPage === totalPages ? "#9CA3AF" : "#3B82F6"} />
                        </TouchableOpacity>
                    </View>
                )}
                
            </View>
            

            {/* NFC Actions */}
            <View style={tw`bg-white rounded-xl shadow-md p-4`}>
                <Text style={tw`text-lg font-bold text-gray-800 mb-3`}>Gerenciamento NFC</Text>
                <Text style={tw`text-gray-500 mb-4`}>Leia ou grave informações nas pulseiras</Text>
                
                <View style={tw`flex-row`}>
                    <TouchableOpacity
                        onPress={readTag}
                        disabled={nfcReading}
                        style={tw`flex-1 bg-blue-600 rounded-lg p-3 mr-2 flex-row items-center justify-center ${nfcReading ? 'opacity-70' : ''}`}
                    >
                        <Icon name="scan" size={20} color="white" style={tw`mr-2`} />
                        <Text style={tw`text-white font-medium`}>Ler</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        onPress={writeNfc}
                        disabled={nfcWriting || !selectedProntuario}
                        style={tw`flex-1 ${nfcWriting || !selectedProntuario ? 'bg-green-400' : 'bg-green-600'} rounded-lg p-3 ml-2 flex-row items-center justify-center ${nfcWriting || !selectedProntuario ? 'opacity-70' : ''}`}
                    >
                        <Icon name="pencil" size={20} color="white" style={tw`mr-2`} />
                        <Text style={tw`text-white font-medium`}>Gravar</Text>
                    </TouchableOpacity>
                </View>
            </View>
            

            {/* NFC Modals */}
            <Modal visible={nfcReading || nfcWriting} transparent={true} animationType="fade">
                <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
                    <View style={tw`bg-white p-6 rounded-xl w-4/5`}>
                        <Text style={tw`text-lg text-center text-gray-800 mb-4`}>
                            {nfcReading ? 'Aproxime a pulseira NFC para leitura' : 'Aproxime a pulseira NFC para gravação'}
                        </Text>
                        <ActivityIndicator size="large" color="#3B82F6" />
                        <TouchableOpacity 
                            onPress={() => {
                                setNfcReading(false);
                                setNfcWriting(false);
                                NfcManager.cancelTechnologyRequest();
                            }}
                            style={tw`mt-4 bg-red-100 p-2 rounded-lg self-center`}
                        >
                            <Text style={tw`text-red-600 font-medium`}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal do Mapa */}
            <Modal visible={mapModalVisible} transparent={true} animationType="slide">
                <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
                    <View style={tw`bg-white p-6 rounded-lg w-4/5`}>
                        <Text style={tw`text-lg text-black mb-6 text-center`}>Deseja abrir o Google Maps?</Text>
                        
                        <View style={tw`flex-row justify-between`}>
                            <TouchableOpacity
                                onPress={() => setMapModalVisible(false)}
                                style={tw`bg-gray-300 rounded-lg p-3 flex-1 mr-2`}
                            >
                                <Text style={tw`text-gray-800 text-center font-medium`}>Cancelar</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                onPress={openMap}
                                style={tw`bg-blue-500 rounded-lg p-3 flex-1 ml-2`}
                            >
                                <Text style={tw`text-white text-center font-medium`}>Abrir Mapa</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            

            <View style={tw`rounded-lg mt-4`}>
                <TouchableOpacity 
                    onPress={() => navigation.navigate('OutrasFuncoes')}
                    style={tw`bg-blue-600 rounded-lg p-3 items-center`}
                >
                    <Text style={tw`text-white font-bold`}>Outras funções</Text>
                </TouchableOpacity>
            </View>
            

        </View>
    );
};     

export default PageGeral;
