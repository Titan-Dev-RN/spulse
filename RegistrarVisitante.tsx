import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Modal, TouchableOpacity, Linking } from 'react-native';
import { supabase } from './services/supabase';
import { useNavigation } from '@react-navigation/native';
import useLocation from './localizacao';
import tw from 'tailwind-react-native-classnames';


const RegistrarVisitante = ({ contextCurrentUser }) => {
    const [visitorList, setVisitorList] = useState([]);
    const [visitorData, setVisitorData] = useState({ name: '', gender: '', age: '' });
    const [selectedProntuario, setSelectedProntuario] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [mapCoordinates, setMapCoordinates] = useState({ latitude: null, longitude: null });

    const { currentLatitude, currentLongitude } = useLocation(); // Use o hook para obter as coordenadas


    const navigation = useNavigation();


    useEffect(() => {
        loadVisitors();
    }, []);

    const loadVisitors = async () => {
        try {
            const { data, error } = await supabase
                .from('visitors')
                .select('*')
                .order('date', { ascending: false });
            if (error) throw error;
            setVisitorList(data);
        } catch (error) {
            console.error('Erro ao carregar visitantes:', error);
        }
    };

    const handleSaveVisitor = async () => {
        /*if (!contextCurrentUser) {
            Alert.alert('Erro', 'Você precisa estar logado para salvar um visitante.');
            return;
        }*/

        try {
            /*const { data: userData, error: userError } = await supabase
                .from('usersSpulse')
                .select('id, name')
                .eq('email', contextCurrentUser)
                .single();

            if (userError || !userData) {
                Alert.alert('Erro', 'Não foi possível obter os dados do usuário logado.');
                console.error('Erro ao obter usuário:', userError);
                return;
            }*/

            //const { id: user_id, name: userName } = userData;
            const currentDateTime = new Date();
            const hours = currentDateTime.toLocaleTimeString();
            const date = currentDateTime.toISOString().split('T')[0];

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
                    user_id: 1,//user_id,
                    registered_by: 'Leonardo', //userName,
                    edited_by: 'Leonardo' // Este campo pode ser atualizado quando houver edição
                }]);

            if (error) {
                Alert.alert('Erro', 'Não foi possível salvar o registro de visitante');
                console.error('Erro ao salvar:', error);
            } else {
                Alert.alert('Sucesso', 'Visitante salvo com sucesso!');
                loadVisitors();
                setVisitorData({ name: '', gender: '', age: '' });
            }
        } catch (error) {
            console.error('Erro ao salvar visitante:', error);
            Alert.alert('Erro', 'Ocorreu um erro ao tentar salvar o visitante.');
        }
        navigation.navigate('VisitorRegistration'); // Nome deve corresponder ao nome registrado no Navigator

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


    const handleRedirect = () => {
        navigation.navigate('VisitorRegistration'); // Redireciona para a página VisitorRegistration
    };

    return (
        <View style={tw`flex-1 bg-gray-100 p-6`}>

            {/* Título da Tela */}
            <Text style={tw`text-2xl font-bold text-black mb-6 text-center`}>
                Registre os Dados do Visitante
            </Text>

            {/* Campo Nome */}
            <TextInput
                style={tw`border border-gray-300 bg-white rounded-lg px-4 py-3 mb-4 text-black`}
                placeholder="Nome"
                placeholderTextColor="#888888"
                value={visitorData.name}
                onChangeText={(text) => setVisitorData({ ...visitorData, name: text })}
            />

            {/* Campo Gênero */}
            <TextInput
                style={tw`border border-gray-300 bg-white rounded-lg px-4 py-3 mb-4 text-black`}
                placeholder="Gênero"
                placeholderTextColor="#888888"
                value={visitorData.gender}
                onChangeText={(text) => setVisitorData({ ...visitorData, gender: text })}
            />

            {/* Campo Idade */}
            <TextInput
                style={tw`border border-gray-300 bg-white rounded-lg px-4 py-3 mb-4 text-black`}
                placeholder="Idade"
                placeholderTextColor="#888888"
                keyboardType="numeric"
                value={visitorData.age}
                onChangeText={(text) => setVisitorData({ ...visitorData, age: text })}
            />

            {/* Botão Salvar Visitante */}
            <TouchableOpacity
                onPress={handleSaveVisitor}
                style={tw`bg-blue-500 rounded-lg p-4 mb-4`}
            >
                <Text style={tw`text-white text-center font-bold`}>Salvar Visitante</Text>
            </TouchableOpacity>

            {/* Botão Ver Prontuários */}
            <TouchableOpacity
                onPress={handleRedirect}
                style={tw`bg-gray-500 rounded-lg p-4`}
            >
                <Text style={tw`text-white text-center font-bold`}>Ver Prontuários</Text>
            </TouchableOpacity>

            {/* Modal para Google Maps */}
            <Modal visible={modalVisible} transparent={true} animationType="slide">
                <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
                    <View style={tw`bg-white p-6 rounded-lg w-4/5`}>
                        <Text style={tw`text-lg text-black mb-6 text-center`}>Deseja abrir o Google Maps?</Text>
                        <TouchableOpacity
                            onPress={openMap}
                            style={tw`bg-blue-500 rounded-lg p-4 mb-4`}
                        >
                            <Text style={tw`text-white text-center font-bold`}>Abrir no Google Maps</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            style={tw`bg-red-500 rounded-lg p-4`}
                        >
                            <Text style={tw`text-white text-center font-bold`}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};



export default RegistrarVisitante;
