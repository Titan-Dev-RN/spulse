import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, TouchableOpacity, ActivityIndicator, PermissionsAndroid, Platform, Modal, Linking } from 'react-native';
import NfcManager, { NfcTech, Ndef, NfcEvents } from 'react-native-nfc-manager';
import { useNavigation } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation'; // Importando a geolocalização
import { supabase } from './services/supabase'; // Importando o cliente Supabase
import { WebView } from 'react-native-webview'; // Importando o WebView para exibir o mapa no Modal
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserContext } from './UserContext';
import FuncoesNFC from './FuncoesNFC'; // Importando o componente NFC
import { Pagination } from '@supabase/supabase-js';
import VisitorRegistration from './PaginaProntuarios';


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


            {/*<Button title="Salvar Registro" onPress={saveVisitor} />*/}
            {/*<Button title="Salvar Edição" onPress={saveEditProntuario} />*/}

            




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



            <FuncoesNFC
                selectedProntuario={selectedProntuario}
                navigateToProntuarioScreen={navigateToProntuarioScreen}
                setLink={setLink}
                setShowPopup={setShowPopup}
            />

            {/*<View style={styles.section}>
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
            </View>

            <View style={styles.section}>
                <Button title="Apagar no chip NFC" onPress={deleteNfc} />
            </View>
                */}



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
