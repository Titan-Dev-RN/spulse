import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, TouchableOpacity, ActivityIndicator, PermissionsAndroid, Platform, Modal, Linking } from 'react-native';
import NfcManager, { NfcTech, Ndef, NfcEvents } from 'react-native-nfc-manager';
import { useNavigation } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation'; // Importando a geolocalização
import { supabase } from './services/supabase'; // Importando o cliente Supabase
import { WebView } from 'react-native-webview'; // Importando o WebView para exibir o mapa no Modal



const ProntuarioScreen = ({ route }) => {
    const { id } = route.params; // Recebe o ID do prontuário
    const [visitorData, setVisitorData] = useState(null); // Estado para armazenar os dados do prontuário
    const [mapUrl, setMapUrl] = useState({ latitude: null, longitude: null }); // URL para exibir o mapa
    const [modalVisible, setModalVisible] = useState(false); // Estado para controlar a visibilidade do modal
    const [currentLatitude, setCurrentLatitude] = useState('');
    const [currentLongitude, setCurrentLongitude] = useState('');



    const fetchVisitor = async () => {
        try {
            const { data, error } = await supabase
                .from('visitors') // Ajuste se a tabela tiver um nome diferente
                .select('*')
                .eq('id', id); // Filtra pelo ID do prontuário

            if (error) {
                throw error; // Lança um erro para ser tratado
            }
            if (data && data.length > 0) {
                setVisitorData(data[0]); // Armazena os dados do prontuário
            } else {
                Alert.alert('Erro', 'Prontuário não encontrado.');
            }
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível buscar os dados do prontuário.');
            console.error('Erro ao buscar prontuário:', error);
        }
    };

    

    /*const callLocation = () => {
        if (Platform.OS === 'ios') {
            getLocation();
        } else {
            const requestLocationPermission = async () => {
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
                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    getLocation();
                } else {
                    Alert.alert('Permissão de Acesso negada');
                }
            };
            requestLocationPermission();
        }
    };
    
    const getLocation = () => {
        Geolocation.getCurrentPosition(
            (position) => {
                const currentLatitude = JSON.stringify(position.coords.latitude);
                const currentLongitude = JSON.stringify(position.coords.longitude);
                setCurrentLatitude(currentLatitude);
                setCurrentLongitude(currentLongitude);
            },
            (error) => {
                console.log(error);
                Alert.alert('Erro', 'Não foi possível obter a localização.');
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
        );
    };*/


    const openMap = (latitude, longitude) => {
        const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
        Linking.openURL(url)
            .catch(err => console.error('Erro ao abrir o Google Maps:', err));
    };
    
    const openMapModal = (latitude, longitude) => {
        setMapUrl({ latitude, longitude });
        setModalVisible(true); // Exibe o modal
    };

    useEffect(() => {
        fetchVisitor(); // Chama a função para buscar os dados ao montar o componente
    }, [id]);

    return (
        <View style={styles.container}>
            {visitorData ? (
                <>
                    <Text style={styles.title}>Visitante ID: {visitorData.id}</Text>
                    <Text style={styles.subtitle}>Nome: {visitorData.name}</Text>
                    <Text style={styles.subtitle}>Idade: {visitorData.age}</Text>
                    <Text style={styles.subtitle}>Horas: {visitorData.hours}</Text>
                    <Text style={styles.subtitle}>Gênero: {visitorData.gender}</Text>
                    <Text style={styles.blackText}>Quem Registrou a Entrada: {visitorData.registered_by}</Text>
                    <Text style={styles.blackText}>Quem Editou o Prontuario: {visitorData.edited_by}</Text>
                    <TouchableOpacity onPress={() => openMapModal(visitorData.latitude, visitorData.longitude)}>
                        <Text style={styles.mapButton}>Abrir no Google Maps</Text>
                    </TouchableOpacity>
                </>
            ) : (
                <Text>Carregando dados do prontuário...</Text>
            )}
    
            {/* Modal para confirmar abertura do Google Maps */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
            >
                <View style={styles.modalContainer}>
                    <Text style={styles.modalText}>Deseja abrir o Google Maps?</Text>
                    <TouchableOpacity 
                        onPress={() => {
                            openMap(mapUrl.latitude, mapUrl.longitude); // Abre o Google Maps com as coordenadas
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
        </View>
    );
};

// Estilos
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        color: 'black',
    },
    subtitle: {
        fontSize: 18,
        marginTop: 20,
        marginBottom: 10,
        color: 'black',
    },
    mapButton: {
        color: 'green',
        marginTop: 5,
    },
    blackText: {
        color: 'black',
    },
});

export default ProntuarioScreen;
