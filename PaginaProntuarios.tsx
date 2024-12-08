import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert, Linking, ScrollView, Button, PermissionsAndroid, Platform } from 'react-native';
import { supabase } from './services/supabase';
import { editProntuario, selectProntuario } from './EditarProntuarios';
import { useNavigation } from '@react-navigation/native';
import FuncoesNFC from './FuncoesNFC'; // Importando o componente NFC
import tw from 'tailwind-react-native-classnames';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { fetchVisitors } from './EditarProntuarios';
import Ionicons from 'react-native-vector-icons/Ionicons'; // Importando Ionicons



const VisitorRegistration = ({ currentLatitude, currentLongitude, contextCurrentUser }) => {
    const [visitorList, setVisitorList] = useState([]);
    const [visitorData, setVisitorData] = useState({ name: '', gender: '', age: '' });
    const [selectedProntuario, setSelectedProntuario] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [mapCoordinates, setMapCoordinates] = useState({ latitude: null, longitude: null });
    const [expandedVisitorId, setExpandedVisitorId] = useState(null); // Controle de exibição dos detalhes
    const [currentPage, setCurrentPage] = useState(1); // Página atual
    const [link, setLink] = useState(''); // Estado para armazenar o link lido
    const [showPopup, setShowPopup] = useState(false); // Controla a visibilidade do modal
    const [loading, setLoading] = useState(true);

    const itemsPerPage = 8; // Número de registros por página

    const navigation = useNavigation();

    const [nfcWriting, setNfcWriting] = useState(false); // Estado de escrita do NFC
    const [nfcReading, setNfcReading] = useState(false); // Estado de leitura do NFC


    useEffect(() => {
        const loadData = async () => {
            //callLocation(); //MODIFIQUE E TIREI O AWAIT POIS TALVEZ FOSSE A ORIGEM DO PROBLEMA
            //await fetchVisitors();
            //await loadVisitors(); // Carrega visitantes, mas não inicia navegações aqui

            //await fetchCurrentUser();
            //setLoading(false); // Defina loading como false após as operações
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
    
        // Cleanup ao desmontar o componente
        return () => {
            linkingListener.remove(); // Remover o listener corretamente
        };
    }, []);
     

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
                Alert.alert('Sucesso', 'O deep link para o prontuário foi gravado no chip NFC!');
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

    const deleteNfc = async () => {
        try {
            setNfcWriting(true);
            await NfcManager.requestTechnology(NfcTech.Ndef);

            const emptyTextRecord = Ndef.textRecord(''); // Registro de texto vazio
            const bytes = Ndef.encodeMessage([emptyTextRecord]);
            if (bytes) {
                await NfcManager.ndefHandler.writeNdefMessage(bytes);
                Alert.alert('Sucesso', 'Os dados foram apagados do chip NFC!');
            } else {
                Alert.alert('Erro', 'Falha ao apagar a mensagem.');
            }
        } catch (ex) {
            console.warn(ex);
            Alert.alert('Erro', 'Falha ao apagar os dados no chip NFC.');
        } finally {
            await NfcManager.cancelTechnologyRequest();
            setNfcWriting(false);
        }
    };

    const loadVisitors = async () => {
        try {
            const { data, error } = await supabase.from('visitors').select('*');
            if (error) throw error;
            setVisitorList(data || []);
            console.log('Visitantes carregados:', data);

        } catch (error) {
            Alert.alert('Erro', 'Não foi possível buscar os registros de visitantes.');
            console.error('Erro ao buscar visitantes:', error);
        }
    };

    const toggleDetails = (visitorId) => {
        setExpandedVisitorId(expandedVisitorId === visitorId ? null : visitorId);
    };

    const handleEditProntuario = async (prontuarioId, updatedData) => {
        const success = await editProntuario(prontuarioId, updatedData);
        if (success) {
            loadVisitors();
        }
    };

    const openMapModal = (latitude, longitude) => {
        setMapCoordinates({ latitude, longitude });
        setModalVisible(true);
    };

    const openMap = () => {
        const { latitude, longitude } = mapCoordinates;
        if (latitude && longitude) {
            const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
            Linking.openURL(url);
        }
        setModalVisible(false);
    };
      
    const handleRedirectBack = () => {
        navigation.navigate('RegistrarVisitante'); // Redireciona para a página VisitorRegistration
    };
    
    const selectProntuario = async (prontuario) => {

        if (!prontuario?.id) {
            Alert.alert('Erro', 'ID do prontuário inválido.');
            return; // Sai da função se o ID for nulo ou indefinido
        }

        try {
            // Redefine o estado antes de buscar novos dados
            setSelectedProntuario(prontuario);
            console.log('Prontuário selecionado:', prontuario);

            // Mostra um indicador de carregamento, se necessário
            setLoading(true);
    
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
            console.warn('Erro ao selecionar prontuário:', ex);
            Alert.alert('Erro', 'Falha ao selecionar o prontuário.');
        } finally {
            // Oculta o indicador de carregamento
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
        <View style={tw`p-4 bg-gray-100 flex-1`}>
            {/* Cabeçalho */}
            <View style={tw`bg-white shadow-md rounded-lg p-4 mb-4`}>
                <Text style={tw`text-xl font-bold text-gray-800`}>Tabela de Visitantes</Text>
                <Text style={tw`text-sm text-gray-500`}>Gerencie os visitantes registrados</Text>
            </View>
    
            {/* Tabela de Visitantes */}
            <ScrollView horizontal={true} style={tw`flex-1`}>
                <View style={tw`min-w-full border border-gray-300 rounded-lg`}>
                    {/* Cabeçalho da Tabela */}
                    <View style={tw`flex-row bg-gray-200 p-4 rounded-t-lg`}>
                        <Text style={tw`flex-1 text-center font-bold text-gray-700`}>Nome</Text>
                        <Text style={tw`flex-1 text-center font-bold text-gray-700`}>Ações</Text>
                    </View>
    
                    {/* Corpo da Tabela */}
                    <ScrollView style={{ maxHeight: 400 }}>
                        {currentVisitors.map((visitor) => (
                            <View
                                key={visitor.id}
                                style={tw`border-b border-gray-300 bg-white`}
                            >
                                {/* Linha Principal */}
                                <View style={tw`flex-row items-center p-4`}>
                                    <Text style={tw`flex-1 text-gray-800 font-medium`}>
                                        {visitor.name}
                                    </Text>
                                    <View style={tw`flex-row space-x-4`}>
                                        <TouchableOpacity
                                            onPress={() => toggleDetails(visitor.id)}
                                            style={tw`p-2`}
                                        >
                                            <Text style={tw`text-blue-500 font-semibold`}>
                                                {expandedVisitorId === visitor.id
                                                    ? 'Ocultar Detalhes'
                                                    : 'Mostrar Detalhes'}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => editProntuario(visitor.id)}
                                            style={tw`p-2`}
                                        >
                                            <Text style={tw`text-green-500 font-semibold`}>
                                                Editar
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
    
                                {/* Detalhes do Visitante */}
                                {expandedVisitorId === visitor.id && (
                                    <View style={tw`bg-gray-50 p-4`}>
                                        <Text style={tw`text-sm text-gray-700 mb-2`}>
                                            Idade: {visitor.age}
                                        </Text>
                                        <Text style={tw`text-sm text-gray-700 mb-2`}>
                                            Quem Registrou: {visitor.registered_by}
                                        </Text>
                                        <Text style={tw`text-sm text-gray-700 mb-2`}>
                                            Quem Editou: {visitor.edited_by}
                                        </Text>
                                        <Text style={tw`text-sm text-gray-700 mb-2`}>
                                            Data: {visitor.date}
                                        </Text>
                                        <Text style={tw`text-sm text-gray-700 mb-4`}>
                                            Horas: {visitor.hours}
                                        </Text>
    
                                        {/* Ações nos Detalhes */}
                                        <TouchableOpacity
                                            onPress={() =>
                                                openMapModal(visitor.latitude, visitor.longitude)
                                            }
                                            style={tw`bg-blue-500 rounded-lg p-3 mb-3`}
                                        >
                                            <Text style={tw`text-white text-center font-medium`}>
                                                Abrir no Google Maps
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                if (visitor && visitor.id) {
                                                    selectProntuario(visitor.id);
                                                } else {
                                                    Alert.alert(
                                                        'Erro',
                                                        'Visitante inválido ou ID não encontrado.'
                                                    );
                                                }
                                            }}
                                            style={tw`bg-gray-200 rounded-lg p-3`}
                                            disabled={loading}
                                        >
                                            <Text style={tw`text-center font-medium text-gray-700`}>
                                                {loading ? 'Carregando...' : 'Selecionar'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </ScrollView>
    
            {/* Funções NFC */}
            <View style={tw`mt-6`}>
                <Text style={tw`text-lg font-bold text-gray-800 mb-4`}>Funções NFC</Text>
                <View style={tw`flex-row justify-around`}>
                    <TouchableOpacity
                        onPress={readTag}
                        disabled={nfcReading}
                        style={tw`bg-blue-500 rounded-lg p-3 flex-1 mr-2 ${
                            nfcReading ? 'opacity-50' : ''
                        }`}
                    >
                        <Text style={tw`text-white text-center font-medium`}>Ler NFC</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={writeNfc}
                        disabled={nfcWriting}
                        style={tw`bg-green-500 rounded-lg p-3 flex-1 mx-2 ${
                            nfcWriting ? 'opacity-50' : ''
                        }`}
                    >
                        <Text style={tw`text-white text-center font-medium`}>Escrever NFC</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={deleteNfc}
                        disabled={nfcWriting}
                        style={tw`bg-red-500 rounded-lg p-3 flex-1 ml-2 ${
                            nfcWriting ? 'opacity-50' : ''
                        }`}
                    >
                        <Text style={tw`text-white text-center font-medium`}>Apagar NFC</Text>
                    </TouchableOpacity>
                </View>
            </View>
    
            {/* Modais NFC */}
            <Modal visible={nfcReading} transparent={true}>
                <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
                    <View style={tw`bg-white p-6 rounded-lg w-4/5`}>
                        <Text style={tw`text-lg text-black mb-4 text-center`}>
                            Aproxime o Chip NFC para realizar a leitura...
                        </Text>
                        <ActivityIndicator size="large" color="#0000ff" />
                    </View>
                </View>
            </Modal>
    
            <Modal visible={nfcWriting} transparent={true}>
                <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
                    <View style={tw`bg-white p-6 rounded-lg w-4/5`}>
                        <Text style={tw`text-lg text-black mb-4 text-center`}>
                            Aproxime o Chip NFC para realizar a escrita ou apagar...
                        </Text>
                        <ActivityIndicator size="large" color="#0000ff" />
                    </View>
                </View>
            </Modal>
        </View>
    );
};     
const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    contentContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    functionsContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    popupContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    popup: {
        width: 300,
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
        alignItems: 'center',
    },
    popupText: {
        fontSize: 16,
        marginBottom: 20,
        color: '#000000',
    },
});
export default VisitorRegistration;
