import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase'; // Importando o cliente Supabase
import { useUserContext } from './UserContext'; // Importando o contexto de usuário
import useLocation from './localizacao';
import tw from 'tailwind-react-native-classnames';


const CheckPoint = () => {

    const formatTime = (date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };

    const [visitorData, setVisitorData] = useState({
        pavilion: '',
        hours: formatTime(new Date()),
        date: new Date().toISOString().split('T')[0],
    });

    const [currentUser, setCurrentUser] = useState(null);
    const [currentUserName, setCurrentUserName] = useState(null); // Estado para o nome do usuário

    const navigation = useNavigation(); 
    const { loginUser } = useUserContext(); // Usar o loginUser do contexto

    const year = new Date().getFullYear();


    const { currentLatitude, currentLongitude } = useLocation(); // Use o hook para obter as coordenadas



    useEffect(() => {
        const loadData = async () => {
            await fetchCurrentUser();
        };
        loadData();
    }, []);
    
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
                    .single(); // Para garantir que retorna apenas um usuário
    
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

    const handleInputChange = (field, value) => {
        setVisitorData({ ...visitorData, [field]: value });
    };

    const handleSaveVisitor = async () => {
        if (visitorData.pavilion) {
            const { data, error } = await supabase
                .from('checkpoints')
                .insert([{
                    user_email: currentUser,
                    pavilion: visitorData.pavilion,
                    hours: visitorData.hours,
                    date: visitorData.date,
                    latitude: currentLatitude,
                    longitude: currentLongitude,
                }]);

            if (error) {
                Alert.alert('Erro', 'Não foi possível salvar o registro de visitante');
                console.error('Erro ao salvar:', error);
            } else {
                Alert.alert('Sucesso', 'Posição salva com sucesso!');
                // Lógica de redirecionamento com base no pavilhão
                if (visitorData.pavilion === '1') {
                    navigation.navigate('PageGeral'); // Redireciona para PageGeral
                } else {
                    navigation.navigate('PageGeral'); // Redireciona para RegistrarVisitantes
                }            
            }
        } else {
            Alert.alert('Erro', 'Por favor, preencha o campo de pavilhão.');
        }
    };

    return (
        <View style={tw`flex-1 bg-gray-100 p-6`}>
            {/* Título */}
            <Text style={tw`text-3xl font-extrabold text-center text-blue-600 mb-10`}>
                Checkpoint do Controlador
            </Text>

            {/* Informação do Usuário Logado */}
            {currentUser && (
                <View style={tw`bg-gray-100 rounded-lg p-4 mb-6 shadow`}>
                    <Text style={tw`text-base text-gray-700`}>
                        Usuário Logado: <Text style={tw`font-bold text-black`}>{currentUserName}</Text>
                    </Text>
                    <Text style={tw`text-black`}>
                        Email: <Text style={tw`font-bold text-black`}>{currentUser}</Text>
                    </Text>
                </View>
            )}

            {/* Campo Pavilhão */}
            <View style={tw`mb-6`}>
                <Text style={tw`text-lg font-semibold text-gray-700 mb-2`}>Pavilhão</Text>
                <TextInput
                    style={tw`border border-gray-300 bg-white rounded-lg px-4 py-3 text-black shadow`}
                    placeholder="Digite o pavilhão"
                    placeholderTextColor="#888888"
                    value={visitorData.pavilion}
                    onChangeText={(text) => handleInputChange('pavilion', text)}
                />
            </View>

            {/* Botão Salvar Registro */}
            <TouchableOpacity
                onPress={handleSaveVisitor}
                style={tw`bg-blue-500 rounded-lg p-4 mb-6 shadow-lg`}
            >
                <Text style={tw`text-white text-center font-bold text-lg`}>Salvar Registro</Text>
            </TouchableOpacity>

            {/* Versão do App */}
            <View style={tw`mt-6 items-center`}>
                <Text style={tw`text-gray-400 text-sm`}>Versão 1.0.0</Text>
                <Text style={tw`text-gray-400 text-xs`}>© {year} Sistema Spulse</Text>
            </View>
        
        </View>
    );
};


export default CheckPoint;
