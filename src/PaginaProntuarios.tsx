import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, Image, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert, Linking, ScrollView, Button, PermissionsAndroid, Platform } from 'react-native';
import { supabase } from '../services/supabase';
import { editProntuario } from './EditarProntuarios';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import FuncoesNFC from './FuncoesNFC'; // Importando o componente NFC
import tw from 'tailwind-react-native-classnames';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { fetchVisitors } from './EditarProntuarios';
import Icon from 'react-native-vector-icons/Ionicons'; // Importando Ionicons
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserContext } from './UserContext';



const PageGeral = ({ currentLatitude, currentLongitude, contextCurrentUser }) => {
    const [visitorList, setVisitorList] = useState([]);
    const [visitorData, setVisitorData] = useState({ name: '', gender: '', age: '' });
    const [selectedProntuario, setSelectedProntuario] = useState(null);
    const [mapModalVisible, setMapModalVisible] = useState(false); // Renomeado para evitar conflito
    const [mapCoordinates, setMapCoordinates] = useState({ latitude: null, longitude: null });
    const [expandedVisitorIdCheck, setExpandedVisitorIdCheck] = useState(null); // Controle de exibição dos detalhes
    const [expandedVisitorId, setExpandedVisitorId] = useState(null); // Controle de exibição dos detalhes
    const [currentPage, setCurrentPage] = useState(1); // Página atual
    const [link, setLink] = useState(''); // Estado para armazenar o link lido
    const [showPopup, setShowPopup] = useState(false); // Controla a visibilidade do modal
    const [loading, setLoading] = useState(true);
    const [checkpoints, setCheckpoints] = useState({}); // Alterado para objeto

    const itemsPerPage = 15; // Número de registros por página
    const navigation = useNavigation();
    const isFocused = useIsFocused(); // Hook para detectar quando a tela está em foco

    const [nfcWriting, setNfcWriting] = useState(false); // Estado de escrita do NFC
    const [nfcReading, setNfcReading] = useState(false); // Estado de leitura do NFC

    const [userPavilion, setUserPavilion] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentUserName, setCurrentUserName] = useState(null); // Estado para o nome do usuário
    
    
    const [isAdmin, setIsAdmin] = useState(false);

    const { logoutUser } = useUserContext();


    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                callLocation();
                await fetchVisitors();
                await loadVisitors();
                
                                  
                await fetchCurrentUser();
                
            } catch (error) {
                console.error('Erro no loadData:', error);
            } finally {
                setLoading(false);
            }
        };
    
        loadData();
        loadVisitors();

        // Função para lidar com deep links
        const handleDeepLink = (event) => {
            const link = event.url;
            console.log('Deep link recebido:', link);
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
     
    /*
    const debugUserData = async () => {
        try {
            const email = await AsyncStorage.getItem('currentUser');
            if (!email) return;

            const { data, error } = await supabase
                .from('usersSpulse')
                .select('*')
                .eq('email', email)

            console.log('Dados completos do usuário:', data);
            console.log('Tipo do campo admin:', typeof data?.admin);
        } catch (error) {
            console.error('Erro no debug:', error);
        }
    };
    */

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
            Alert.alert('Erro', 'Falha ao gravar o deep link no chip NFC.');
        } finally {
            await NfcManager.cancelTechnologyRequest();
            setNfcWriting(false);
        }
    };

    const loadVisitors = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase.from('visitors').select('*');

            if (error) throw error;

            setVisitorList(data || []);
            //console.log('Visitantes carregados:', data);
            setCurrentPage(1); // Resetar para a primeira página

        } catch (error) {
            Alert.alert('Erro', 'Não foi possível buscar os registros de visitantes.');
            console.error('Erro ao buscar visitantes:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCurrentUser = async () => {
        try {
            const email = await AsyncStorage.getItem('currentUser');
            if (email) {
                setCurrentUser(email);
                // Buscar o nome do usuário a partir do email
                const { data, error } = await supabase
                    .from('usersSpulse') // Supondo que sua tabela de usuários se chama 'users'
                    .select('name')
                    .eq('email', email)

                if (error) {
                    console.warn('Erro ao buscar o nome do usuário:', error);
                } else {
                    setCurrentUserName(data?.name);
                }
            } else {
                console.warn('Nenhum usuário logado encontrado.');
            }
        } catch (error) {
            console.error('Erro ao buscar usuário atual:', error);
        }
    };

    
    // Adicione este useEffect para monitorar mudanças no estado de admin
    useEffect(() => {
        // DEBUG: Ver todos os dados do usuário
        const tests = async () => {
            //await debugUserData();

            // Busca o pavilhão
            const pavilion = await fetchUserPavilion();
            setUserPavilion(pavilion);

        }
        
        tests();
        //console.log('Status de admin atualizado:', isAdmin);
    }, [isAdmin]);

    const fetchUserPavilion = async () => {
        try {
            const email = await AsyncStorage.getItem('currentUser');
            if (!email) {
                console.warn('Nenhum email encontrado no AsyncStorage');
                return null;
            }

            const { data, error } = await supabase
                .from('checkpoints')
                .select('pavilion')
                .eq('user_email', email)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error) throw error;
            
            if (data) {
                console.log('Pavilhão encontrado:', data.pavilion);
                return data.pavilion;
            } else {
                console.warn('Nenhum registro de checkpoint encontrado para:', email);
                return null;
            }
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


    // Função fictícia para simular os pavilhões
    const getCheckpoints = async (visitorId) => {
        if (!visitorId) {
          Alert.alert('Erro', 'ID do visitante não fornecido');
          return [];
        }
        console.log(visitorId)
      
        try {
            // Consulta os checkpoints do visitante na tabela `checkpoints_visitors`
            const { data: checkpointsData, error } = await supabase
                .from('checkpoints_visitors')
                .select('*')
                .eq('visitor_id', visitorId)
                //.order('time', { ascending: true }); // Ordena pelos registros mais antigos
                console.log('Dados completos:', checkpointsData, 'Erro:', error);

      
            if (error) throw error;

            // Transforma os dados em um formato mais legível
            return checkpointsData.map((checkpoint) => {
                const dateObj = new Date(checkpoint.time);
                return {
                    pavilion: checkpoint.pavilion || 'Pavilhão desconhecido',
                    time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    date_day: dateObj.toLocaleDateString(),
                    fullTime: checkpoint.time // Mantemos o timestamp original para ordenação
                };
            });
          
        } catch (error) {
          console.error('Erro ao processar checkpoints:', error.message);
          Alert.alert('Erro', 'Ocorreu um erro ao processar checkpoints');
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
      
    const handleRedirectBack = () => {
        navigation.navigate('RegistrarVisitante'); // Redireciona para a página PageGeral
    };

    const redirectMarkCheckpoints = () => {
        navigation.navigate('MarcarCheckpoints'); // Redireciona para a página MarcarCheckpoints
    };


    const selectProntuario = async (prontuario) => {
        // Mostra um indicador de carregamento, se necessário
        setLoading(true);

        try {
            // Verifica se o objeto prontuario e o id são válidos
            if (!prontuario || !prontuario.id) {
                Alert.alert('Erro', 'ID do prontuário inválido.');
                return;
            }

            // Redefine o estado antes de buscar novos dados
            setSelectedProntuario(prontuario);
            console.log('Prontuário selecionado:', prontuario);
    
            // Consulta no banco de dados para obter o prontuário completo pelo ID
            const { data, error } = await supabase
                .from('visitors') // Supondo que a tabela seja 'visitors'
                .select('*')
                .eq('id', prontuario.id);
    
            if (error) {
                console.error('Erro ao buscar prontuário:', error);
                Alert.alert('Erro', 'Não foi possível buscar os dados do prontuário.');
            } else {
                if (data && data.length > 0) {
                    setSelectedProntuario(data[0]); // Armazena o prontuário completo no estado
                } else {
                    Alert.alert('Erro', 'Prontuário não encontrado.');
                }
            }
        } catch (ex) {
            console.warn('Erro ao selecionar visitante:', ex);
            Alert.alert('Erro', 'Falha ao selecionar o visitante.');
        } finally {
            // Oculta o indicador de carregamento
            setLoading(false);
            console.log('Estado de carregamento desativado.');

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
                                        <View style={tw`mb-3`}>
                                            <Text style={tw`text-xs text-gray-500`}>Editado por</Text>
                                            <Text style={tw`text-gray-700`}>{visitor.edited_by}</Text>
                                        </View>
                                        <View style={tw`flex-row mb-4`}>
                                            <View style={tw`flex-1`}>
                                                <Text style={tw`text-xs text-gray-500`}>Data</Text>
                                                <Text style={tw`text-gray-700`}>{visitor.date}</Text>
                                            </View>
                                            <View style={tw`flex-1`}>
                                                <Text style={tw`text-xs text-gray-500`}>Horário</Text>
                                                <Text style={tw`text-gray-700`}>{visitor.hours}</Text>
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
                                    <View style={tw`bg-amber-50 p-4`}>
                                        <Text style={tw`text-lg font-bold text-gray-800 mb-3`}>Histórico de Pavilhões</Text>
                                        
                                        {checkpoints[visitor.id] && checkpoints[visitor.id].length > 0 ? (
                                            checkpoints[visitor.id].map((checkpoint, index) => (
                                                <View key={`${checkpoint.visitor_id}-${index}`} style={tw`flex-row justify-between items-center py-2 border-b border-gray-100`}>
                                                    <View>
                                                        <Text style={tw`font-medium text-gray-700`}>{checkpoint.pavilion}</Text>
                                                        <Text style={tw`text-xs text-gray-500`}>{checkpoint.date_day}</Text>
                                                    </View>
                                                    <Text style={tw`text-gray-700`}>{checkpoint.time}</Text>
                                                </View>
                                            ))
                                        ) : (
                                            <View style={tw`py-4 items-center`}>
                                                <Icon name="alert-circle" size={24} color="#6B7280" />
                                                <Text style={tw`text-gray-500 mt-2`}>Nenhum registro encontrado</Text>
                                            </View>
                                        )}
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
