import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, TouchableOpacity, ActivityIndicator, PermissionsAndroid, Platform, Modal, Linking } from 'react-native';
import NfcManager, { NfcTech, Ndef, NfcEvents } from 'react-native-nfc-manager';
import { useNavigation } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation'; // Importando a geolocalização
import { supabase } from './services/supabase'; // Importando o cliente Supabase
import { WebView } from 'react-native-webview'; // Importando o WebView para exibir o mapa no Modal
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserContext } from './UserContext';

const InputCRUD = () => {
    
    const [visitorData, setVisitorData] = useState({
        name: '',
        gender: '',
        age: '',
        hours: '',
        user_id: '',
    });



    const [savedLink, setSavedLink] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ'); // Link padrão
    const [link, setLink] = useState(''); // Estado para armazenar o link lido
    const [crud, setCRUDS] = useState([]);
    const [visitors, setVisitors] = useState([]);
    const [editingProntuarioId, setEditingProntuarioId] = useState(null);
    const [currentLatitude, setCurrentLatitude] = useState('');
    const [currentLongitude, setCurrentLongitude] = useState('');
    const [modalVisible, setModalVisible] = useState(false); // Estado para controlar a visibilidade do modal
    const [mapUrl, setMapUrl] = useState({ latitude: null, longitude: null }); // URL para exibir o mapa
    const [nfcWriting, setNfcWriting] = useState(false); // Controla o estado do NFC (escrita)
    const [nfcReading, setNfcReading] = useState(false); // Controla o estado do NFC (leitura)
    const [showPopup, setShowPopup] = useState(false); // Controla a visibilidade do modal
    const [selectedProntuario, setSelectedProntuario] = useState(null); // Prontuário selecionado
    const [currentUser, setCurrentUser] = useState(null);
    const navigation = useNavigation();
    const { currentUser: contextCurrentUser } = useUserContext(); // Context state
    const [currentRegister, setRegisteredBy] = useState(null);;
    const [currentEditRegister, setEditRegisteredBy] = useState(null);;
    const [editingVisitor, setEditingVisitor] = useState(null); // Estado para visitante em edição
    const [loading, setLoading] = useState(true);



    useEffect(() => {
        const loadData = async () => {
            callLocation(); //MODIFIQUE E TIREI O AWAIT POIS TALVEZ FOSSE A ORIGEM DO PROBLEMA
            await fetchVisitors();
            await fetchCurrentUser();
            setLoading(false); // Defina loading como false após as operações
        };
    
        loadData();
    
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
     
    
    const fetchCurrentUser = async () => {
        try {
            const email = await AsyncStorage.getItem('currentUser');
            if (email) {
                setCurrentUser(email);
            } else {
                console.warn('Nenhum usuário logado encontrado.');
            }
        } catch (error) {
            console.error('Erro ao buscar usuário atual:', error);
        }
    };
    
    const navigateToProntuarioScreen = (prontuarioId) => {
        // Navegar para a tela do prontuário no app com base no ID
        navigation.navigate('ProntuarioScreen', { id: prontuarioId });
    };
    

    

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
                    setLink(decodedText); // Armazene o link no estado
                    setShowPopup(true); // Exibe o modal com o link (opcional)
    
                    // Extrair o ID do prontuário do deep link e navegar
                    const prontuarioId = decodedText.split('/').pop(); // Ex: myapp://prontuario/12345
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



    const callLocation = () => {
        if (Platform.OS === 'ios') {
            getLocation();
        } else {
            console.log('Executando no Android, solicitando permissão de localização...');
            const requestLocationPermission = async () => {
                try {
                    const granted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                        {
                            title: "Permissão de Acesso à Localização",
                            message: "Este aplicativo precisa acessar sua localização",
                            buttonNeutral: "Pergunte-me depois",
                            buttonNegative: "Cancelar",
                            buttonPositive: "OK"
                        }
                    );
                    console.log('Resultado da solicitação de permissão:', granted);
                    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                        console.log('Permissão concedida. Chamando getLocation...');
                        getLocation();
                    } else {
                        console.log('Permissão negada.');
                        Alert.alert('Permissão de Acesso negada');
                    }
                } catch (err) {
                    console.warn(err);
                    console.error('Erro ao solicitar permissão:', err); // Captura qualquer erro ao solicitar permissão
                }
            };
            requestLocationPermission();
        }
    };

    const getLocation = () => {
        console.log('Obtendo a localização...');
        Geolocation.getCurrentPosition(
            (position) => {
                console.log('Localização obtida com sucesso:', position);
                const currentLatitude = JSON.stringify(position.coords.latitude);
                const currentLongitude = JSON.stringify(position.coords.longitude);
                console.log('Latitude:', currentLatitude, 'Longitude:', currentLongitude); // Log de lat/long
                setCurrentLatitude(currentLatitude);
                setCurrentLongitude(currentLongitude);
            },
            (error) => {
                console.error('Erro ao obter a localização:', error); // Exibe o erro de obtenção da localização
                Alert.alert('Erro', 'Não foi possível obter a localização.');
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
        );
    };

    const handleInputChange = (field, value) => {
        setVisitorData({ ...visitorData, [field]: value });
    };

    const fetchVisitors = async () => {
        const { data, error } = await supabase
            .from('visitors')
            .select('*');

        if (error) {
            Alert.alert('Erro', 'Não foi possível buscar os registros de visitantes.');
            console.error('Erro ao buscar visitantes:', error);
        } else {
            setVisitorData(data);
        }
    };

    const saveVisitor = async () => {
        // Verifica se o usuário está logado
        if (!contextCurrentUser) {
            Alert.alert('Erro', 'Você precisa estar logado para salvar um visitante.');
            return;
        }
    
        try {
            // Busca o pavilhão do usuário logado para verificar se ele está no "HALL" (pavillion = 1)
            const { data: pavilionData, error: pavilionError } = await supabase
                .from('checkpoints')
                .select('pavilion, id, user_email')
                .eq('user_email', contextCurrentUser)
                //.limit(1)  // Limita a consulta a uma linha
                .order('id', { ascending: false }) // Ordena em ordem decrescente para pegar o último registro
                .limit(1) // Limita a consulta a um registro (último)
                .single();
    
            const { data: userData, error: userError } = await supabase
            .from('usersSpulse')
            .select('id, name') // Assumindo que você tem uma coluna id para o user_id
            .eq('email', contextCurrentUser)
            .single();


            if (pavilionError || !pavilionData) {
                Alert.alert('Erro', 'Não foi possível encontrar o pavilhão do usuário logado.');
                console.error('Erro ao encontrar o pavilhão:', pavilionError);
                return;
            }
            const { id: user_id, name: userName  } = userData; // Obtém o user_id do usuário logado
            const { pavilion } = pavilionData;
            // Log para verificar os valores de pavilion e userName
            console.log(`Pavilion: ${pavilion}, Usuário: ${contextCurrentUser}`);


            // Verifica se o usuário está no "HALL"
            if (pavilion !== 1) {
                Alert.alert('Erro', 'Você precisa estar no HALL para salvar um visitante.');
                return;
            }
    
            // Insere o visitante no banco de dados
            const { data, error } = await supabase
                .from('visitors')
                .insert([{
                    name: visitorData.name,
                    gender: visitorData.gender,
                    age: visitorData.age,
                    hours: new Date().toLocaleTimeString(),
                    date: new Date().toISOString().split('T')[0],
                    latitude: currentLatitude,
                    longitude: currentLongitude,
                    user_id: user_id,
                    registered_by: userName
                }]);
    
            if (error) {
                Alert.alert('Erro', 'Não foi possível salvar o registro de visitante');
                console.error('Erro ao salvar:', error);
            } else {
                Alert.alert('Sucesso', 'Visitante salvo com sucesso!');
                setRegisteredBy(userName);
                fetchVisitors();
                setVisitorData({ name: '', gender: '', hours: '', age: '', user_id: '' });
                setSelectedProntuario(null); // Deseleciona o prontuário após o salvamento
            }
        } catch (error) {
            console.error('Erro ao salvar visitante:', error);
            Alert.alert('Erro', 'Ocorreu um erro ao tentar salvar o visitante.');
        }
    };
    

    const editProntuario = async (prontuarioId, updatedData) => {
        const { data, error } = await supabase
            .from('visitors')
            .update(updatedData)
            .eq('id', prontuarioId); // Substitua 'id' pelo nome da coluna que armazena o ID do prontuário
    
        if (error) {
            Alert.alert('Erro', 'Não foi possível editar o visitante');
            console.error('Erro ao editar:', error);
        } else {
            Alert.alert('Sucesso', 'Visitante editado com sucesso!');
            fetchVisitors(); // Atualiza a lista de prontuários após a edição
        }
    };
    
    // Exemplo de uso
    // editProntuario(prontuarioId, { nome: 'Novo Nome', idade: 30 });
    

    // Função para preencher os inputs com os dados do visitante ao editar
    const editProntuarioInput = (visitor) => {
        setVisitorData({
            name: visitor.name,
            age: visitor.age.toString(), // Certifique-se de converter a idade para string
            gender: visitor.gender,
        });
        setEditingVisitor(visitor); // Guarda o visitante que está sendo editado
    };

    // Função para salvar as edições
    // Função para salvar as edições
    // Função para salvar as edições
    const saveEditProntuario = async () => {
        if (!editingVisitor) return; // Se não houver visitante em edição, não faz nada

        try {
            // Busca o user_id e o nome do usuário logado
            const { data: userData, error: userError } = await supabase
                .from('usersSpulse') // Tabela de usuários (ajuste conforme o nome da sua tabela de usuários)
                .select('id, name')
                .eq('email', currentUser); // Filtra pelo email do usuário logado

            if (userError || !userData.length) {
                console.error('Erro ao buscar user_id:', userError);
                Alert.alert('Erro', 'Não foi possível encontrar o usuário logado.');
                return;
            }

            const { id: edit_id, name: userName } = userData[0]; // Obtém o id do usuário logado que está editando

            // Verifica se o id do editor é válido
            if (!edit_id) {
                console.error('ID do editor é inválido:', edit_id);
                Alert.alert('Erro', 'Não foi possível identificar o usuário que está editando.');
                return;
            }

            // Atualiza os dados do visitante
            const { data, error } = await supabase
                .from('visitors') // Tabela de visitantes
                .update({
                    name: visitorData.name,
                    age: parseInt(visitorData.age), // Certifica-se de que a idade é um número
                    gender: visitorData.gender,
                    hours: new Date().toLocaleTimeString(), // Armazena a hora atual
                    date: new Date().toISOString().split('T')[0], // Armazena a data atual
                    latitude: currentLatitude,
                    longitude: currentLongitude,
                    userEdit_id: edit_id, // Associa o visitante ao usuário que fez a edição
                    edited_by: userName, // Adiciona o nome do usuário que registrou
                })
                .eq('id', editingVisitor.id); // Atualiza o visitante pelo ID

            if (error) {
                Alert.alert('Erro', 'Não foi possível editar o prontuário');
                console.error('Erro ao editar:', error);
            } else {
                Alert.alert('Sucesso', 'Prontuário editado com sucesso!');
                setEditingVisitor(null); // Limpa o visitante em edição
                fetchVisitors(); // Atualiza a lista de visitantes

                // Limpa os inputs
                setVisitorData({ name: '', age: '', gender: '', userEdit_id: '' }); 
            }
        } catch (err) {
            console.error('Erro ao processar a edição:', err);
            Alert.alert('Erro', 'Algo deu errado ao processar a edição.');
        }

        console.log('Editing Visitor ID:', editingVisitor.id);
        console.log('User ID of Editor:', edit_id);
        console.log('Visitor Data:', visitorData);
    };




    /*const deleteVisitors = async (prontuarioId) => {

         // Verifica se o prontuarioId é um valor válido
        if (typeof prontuarioId !== 'number' && typeof prontuarioId !== 'string') {
            Alert.alert('Erro', 'ID de prontuário inválido');
            return;
        }
    
            try {
                const { data, error } = await supabase
                    .from('visitors')
                    .delete()
                    .eq('id', prontuarioId); // Use o campo 'id' da sua tabela de visitantes
        
                if (error) {
                    Alert.alert('Erro', 'Não foi possível deletar o prontuário');
                    console.error('Erro ao deletar:', error);
                } else {
                    Alert.alert('Sucesso', 'Prontuário deletado com sucesso!');
                    fetchVisitors(); // Atualiza a lista de visitantes após a exclusão
                }
            } catch (err) {
                console.error('Erro ao tentar deletar o prontuário:', err);
                Alert.alert('Erro', 'Algo deu errado ao tentar deletar o prontuário.');
            }
    };*/
    
    // Exemplo de uso
    // deleteProntuario(prontuarioId);
    
    const selectProntuario = async (prontuario) => {
        try {
            // Aqui fazemos a consulta no banco de dados para obter o prontuário completo pelo ID
            const { data, error } = await supabase
                .from('visitors') // Supondo que a tabela seja 'prontuarios'
                .select('*')
                .eq('id', prontuario.id);
    
            if (error) {
                console.error('Erro ao buscar prontuário:', error);
                Alert.alert('Erro', 'Não foi possível buscar os dados do prontuário.');
            } else {
                // Supondo que data[0] retorne o prontuário correto
                if (data && data.length > 0) {
                    setSelectedProntuario(data[0]); // Armazena o prontuário completo no estado
                } else {
                    Alert.alert('Erro', 'Prontuário não encontrado.');
                }
            }
        } catch (ex) {
            console.warn('Erro ao selecionar prontuário:', ex);
            Alert.alert('Erro', 'Falha ao selecionar o prontuário.');
        }
    };
    
    const openMapModal = (latitude, longitude) => {
        //setMapUrl(`https://www.google.com/maps?q=${latitude},${longitude}`);
        setMapUrl({ latitude, longitude });
        setModalVisible(true);
    };

    // Função para abrir o Google Maps
    const openMap = (latitude, longitude) => {
        const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
        Linking.openURL(url)
            .catch(err => console.error('Erro ao abrir o Google Maps:', err));
    };

    return (
        <ScrollView style={styles.container}>


            {/* Cabeçalho com o nome do usuário */}
            
            {currentUser ? (
                <Text style={styles.headerText}>Usuário logado: {currentUser}</Text>
            ) : (
                <Text>Nenhum usuário logado.</Text>
            )}
            
            {/* O restante do seu componente */}

            <Text style={styles.title}>Registrar Visitante</Text>

            <TextInput
                style={styles.input}
                placeholder="Nome"
                placeholderTextColor="#888888"
                value={visitorData.name} // Exibe o nome do visitante em edição
                onChangeText={(text) => setVisitorData({ ...visitorData, name: text })} // Atualiza o estado corretamente
            />

            <TextInput
                style={styles.input}
                placeholder="Gênero"
                placeholderTextColor="#888888"
                value={visitorData.gender} // Exibe o gênero do visitante em edição
                onChangeText={(text) => setVisitorData({ ...visitorData, gender: text })} // Atualiza o estado corretamente
            />

            <TextInput
                style={styles.input}
                placeholder="Idade"
                placeholderTextColor="#888888"
                keyboardType="numeric" // Certifique-se de que o campo de idade aceita apenas números
                value={visitorData.age} // Exibe a idade do visitante em edição
                onChangeText={(text) => setVisitorData({ ...visitorData, age: text })} // Atualiza o estado corretamente
            />

            <Button title="Salvar Registro" onPress={saveVisitor} />
            <Button title="Salvar Edição" onPress={saveEditProntuario} />

            {/*For para mostrar todos os prontuarios registrados no banco de dados*/}
            {visitorData.length > 0 ? (
                visitorData.map((visitor) => (
                    <View key={visitor.id} style={styles.prontuarioItem}>

                        {/*Mostrar individualmente as caracteristicas de cada usuario*/}
                        <Text style={styles.blackText}>Nome: {visitor.name}</Text>
                        <Text style={styles.blackText}>Idade: {visitor.age}</Text>
                        <Text style={styles.blackText}>Quem Registrou a Entrada: {visitor.registered_by}</Text>
                        <Text style={styles.blackText}>Quem Editou o Visitante: {visitor.edited_by}</Text>
                        <Text style={styles.blackText}>Data: {visitor.date}</Text>
                        <Text style={styles.blackText}>Horas: {visitor.hours}</Text>



                        {/*Abrir individualmente cada usuario no google maps*/}
                        <TouchableOpacity onPress={() => openMapModal(visitor.latitude, visitor.longitude)}>
                            <Text style={styles.mapButton}>Abrir no Google Maps</Text>
                        </TouchableOpacity>

                        {/*Botao para editar individualmente cada usuario*/}
                        <TouchableOpacity onPress={() => editProntuarioInput(visitor)}>
                            <Text style={styles.mapButton}>Editar o Visitante</Text>
                        </TouchableOpacity>

                        {/*Botao para editar individualmente cada usuario*/}
                        {/*<TouchableOpacity onPress={() => deleteVisitors(visitor.id)}>
                            <Text style={styles.mapButton}>Deletar o Visitante</Text>
                        </TouchableOpacity>*/}

                        <TouchableOpacity onPress={() => selectProntuario(visitor)}>
                            <Text style={selectedProntuario?.id === visitor.id ? styles.selectedButton : styles.mapButton}>
                                {selectedProntuario?.id === visitor.id ? 'Selecionado' : 'Selecionar'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ))
            ) : (
                <Text>Nenhum visitante cadastrado</Text>
            )}




            {/* Modal para exibir o mapa 
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalView}>
                    <WebView source={{ uri: mapUrl }} style={{ flex: 1 }} />
                    <Button title="Fechar" onPress={() => setModalVisible(false)} />
                </View>
            </Modal>
            */}

            
            {/* Modal para exibir o mapa da 2 forma */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
            >
                <View style={styles.modalContainer}>
                    <Text style={styles.modalText}>Deseja abrir o Google Maps?</Text>
                    <TouchableOpacity 
                        onPress={() => {
                            openMap(mapUrl.latitude, mapUrl.longitude);
                            setModalVisible(false); // Fecha o modal após abrir o mapa
                        }}
                    >
                        <Text style={styles.mapButton}>Abrir no Google Maps</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                        <Text style={styles.cancelButton}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            <View style={styles.section}>
                <Button title="Escrever visitante no chip NFC" onPress={writeNfc} />
            </View>

            <View style={styles.section}>
                <Button title="Ler NFC" onPress={readTag} />
                
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={showPopup}
                    onRequestClose={() => setShowPopup(false)}
                >
                    <View style={styles.modalView}>
                        <Text style={styles.modalText}>Link lido:</Text>
                        <Text style={styles.linkText}>{link}</Text>
                        <Button title="Fechar" onPress={() => setShowPopup(false)} />
                    </View>
                </Modal>

            </View>

            {/*<View style={styles.section}>
                <Button title="Escrever link no chip NFC" onPress={writeNfc} />
            </View>*/}

            <View style={styles.section}>
                <Button title="Apagar no chip NFC" onPress={deleteNfc} />
            </View>

            {/*savedLink ? (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Link do YouTube Salvo:</Text>
                    <Text style={styles.sectionTitle}>{savedLink}</Text>
                </View>
            ) : null*/}

            {/* Modal de espera para leitura NFC */}
            <Modal visible={nfcReading} transparent={true}>
                <View style={styles.popupContainer}>
                    <View style={styles.popup}>
                        <Text style={styles.popupText}>
                            Aproxime o Chip NFC para realizar a leitura...
                        </Text>
                        {nfcReading && <ActivityIndicator size="large" color="#0000ff" />}
                    </View>
                </View>
            </Modal>

            {/* Modal de espera para write ou delete do NFC */}
            <Modal visible={nfcWriting} transparent={true}>
                <View style={styles.popupContainer}>
                    <View style={styles.popup}>
                        <Text style={styles.popupText}>
                            Aproxime o Chip NFC para realizar a escrita ou apagar...
                        </Text>
                        {nfcWriting && <ActivityIndicator size="large" color="#0000ff" />}
                    </View>
                </View>
            </Modal>


        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: "black",    
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        marginBottom: 10,
        paddingHorizontal: 10,
        color: 'black',
    },
    subtitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        color: 'black',
    },
    prontuarioItem: {
        marginBottom: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        color: 'black',
    },
    prontuarioText: {
        fontSize: 16,
    },
    mapButton: {
        color: 'green',
        marginTop: 5,
    },
    modalView: {
        flex: 1,
        backgroundColor: 'white',
        padding: 20,
    },
    blackText: {
        color: 'black',
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#000000',
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        color: '#000000',
    },
    linkText: {
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#000000',
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
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginVertical: 10,
        textAlign: 'center',
        color: 'black',
    },
    
});

export default InputCRUD;
