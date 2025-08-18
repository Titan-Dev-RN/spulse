import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, TouchableOpacity, ActivityIndicator, PermissionsAndroid, Platform, Modal, Linking } from 'react-native';
import NfcManager, { NfcTech, Ndef, NfcEvents } from 'react-native-nfc-manager';
import { useNavigation } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation'; // Importando a geolocalização
import { supabase } from '../services/supabase'; // Importando o cliente Supabase
import { WebView } from 'react-native-webview'; // Importando o WebView para exibir o mapa no Modal
import tw from 'tailwind-react-native-classnames';



const ProntuarioScreen = ({ route }) => {
    const { id } = route.params; // Use um fallback caso `route.params` esteja indefinido
    console.log('ID recebido:', id);


    //const { id } = route.params; // Recebe o ID do prontuário
    const [visitorData, setVisitorData] = useState(null); // Estado para armazenar os dados do prontuário
    const [mapUrl, setMapUrl] = useState({ latitude: null, longitude: null }); // URL para exibir o mapa
    const [modalVisible, setModalVisible] = useState(false); // Estado para controlar a visibilidade do modal
    const [currentLatitude, setCurrentLatitude] = useState('');
    const [currentLongitude, setCurrentLongitude] = useState('');

    const navigation = useNavigation();

    useEffect(() => {
        if (id) {
            fetchVisitor(); // Chama apenas se `id` estiver definido
        } else {
            Alert.alert('Erro', 'ID do prontuário não fornecido.');
        }
    }, [id]);
    
    

    const fetchVisitor = async () => {
        if (!id) {
            console.error('ID inválido para consulta.');
            return;
        }
    
        try {
            const { data, error } = await supabase
                .from('visitors')
                .select('*')
                .eq('id', id);
    
            if (error) throw error;
    
            if (data && data.length > 0) {
                setVisitorData(data[0]);
            } else {
                Alert.alert('Erro', 'Prontuário não encontrado.');
            }
        } catch (error) {
            console.error('Erro ao buscar prontuário:', error);
            Alert.alert('Erro', 'Não foi possível buscar os dados do prontuário.');
        }
    };
    

    

    const callLocation = () => {
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
    };


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
        <ScrollView contentContainerStyle={tw`p-6 bg-gray-50 flex-grow`}>
            {visitorData ? (
                <View style={tw`bg-white rounded-xl shadow-md p-6`}>
                    <Text style={tw`text-3xl font-bold text-gray-800 mb-4`}>Ficha</Text>
                    
                    <View style={tw`mb-6`}>
                        <Text style={tw`text-sm font-medium text-gray-500`}>ID do Visitante</Text>
                        <Text style={tw`text-lg text-gray-800 mt-1`}>{visitorData.id}</Text>
                    </View>

                    <View style={tw`mb-6`}>
                        <Text style={tw`text-sm font-medium text-gray-500`}>Nome</Text>
                        <Text style={tw`text-xl font-semibold text-gray-800 mt-1`}>{visitorData.name}</Text>
                    </View>

                    <View style={tw`flex-row justify-between mb-6`}>
                        <View style={tw`w-1/2 pr-2`}>
                            <Text style={tw`text-sm font-medium text-gray-500`}>Idade</Text>
                            <Text style={tw`text-lg text-gray-800 mt-1`}>{visitorData.age}</Text>
                        </View>
                        <View style={tw`w-1/2 pl-2`}>
                            <Text style={tw`text-sm font-medium text-gray-500`}>Gênero</Text>
                            <Text style={tw`text-lg text-gray-800 mt-1`}>{visitorData.gender}</Text>
                        </View>
                    </View>

                    <View style={tw`mb-6`}>
                        <Text style={tw`text-sm font-medium text-gray-500`}>Horas</Text>
                        <Text style={tw`text-lg text-gray-800 mt-1`}>{visitorData.hours}</Text>
                    </View>

                    <View style={tw`mb-6 bg-gray-100 p-4 rounded-lg`}>
                        <Text style={tw`text-sm font-medium text-gray-500`}>Registrado por</Text>
                        <Text style={tw`text-base text-gray-800 mt-1`}>{visitorData.registered_by}</Text>
                    </View>

                    <View style={tw`mb-6 bg-gray-100 p-4 rounded-lg`}>
                        <Text style={tw`text-sm font-medium text-gray-500`}>Checkpoints:</Text>

                    </View>

                    <TouchableOpacity
                        onPress={() => openMapModal(visitorData.latitude, visitorData.longitude)}
                        style={tw`bg-blue-600 rounded-lg p-4 shadow-lg flex-row justify-center items-center`}
                    >
                        <Text style={tw`text-white text-lg font-semibold`}>
                            Ver Localização no Mapa
                        </Text>
                    </TouchableOpacity>
                    {/* Back Button */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('PageGeral')}
                        style={tw`mt-4 bg-gray-200 rounded-lg p-4`}
                    >
                        <Text style={tw`text-gray-800 font-medium text-center`}>Voltar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={tw`flex-1 justify-center items-center`}>
                    <Text style={tw`text-lg text-gray-500`}>Carregando dados do prontuário...</Text>
                </View>
            )}

            {/* Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
            >
                <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
                    <View style={tw`bg-white p-6 rounded-xl w-5/6 max-w-md`}>
                        <Text style={tw`text-xl font-bold text-gray-800 mb-4 text-center`}>
                            Abrir no Google Maps?
                        </Text>
                        <Text style={tw`text-gray-600 mb-6 text-center`}>
                            Você será redirecionado para o aplicativo do Google Maps.
                        </Text>
                        
                        <View style={tw`flex-row justify-between`}>
                            <TouchableOpacity 
                                onPress={() => setModalVisible(false)}
                                style={tw`bg-gray-200 rounded-lg px-6 py-3 flex-1 mr-2`}
                            >
                                <Text style={tw`text-gray-800 text-center font-medium`}>Cancelar</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                onPress={() => {
                                    openMap(mapUrl.latitude, mapUrl.longitude);
                                    setModalVisible(false);
                                }}
                                style={tw`bg-blue-600 rounded-lg px-6 py-3 flex-1 ml-2`}
                            >
                                <Text style={tw`text-white text-center font-medium`}>Abrir</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};


export default ProntuarioScreen;
