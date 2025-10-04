import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabase'; // Importando o cliente Supabase
import { useUserContext } from './UserContext'; // Importando o contexto corretamente
//import { checkpoint } from './checkpoint'; //Importando a página do CheckPoint
import tw from 'tailwind-react-native-classnames';


const Login = () => {
    const [email, setEmail] = useState(''); 
    const [password, setPassword] = useState('');
    const navigation = useNavigation(); 
    const { loginUser } = useUserContext(); // Usar o loginUser do contexto
    const [loading, setLoading] = useState(false);

    const year = new Date().getFullYear();

    const handleLogin = async () => {
        setLoading(true);

        if (email && password) {
            try {
            // Verifica se o usuário existe com email e senha
            const { data: userData, error } = await supabase
                .from('usersSpulse')
                .select('email, senha, admin') // já pega o campo admin
                .eq('email', email)
                .eq('senha', password)
                .single();

            if (error || !userData) {
                Alert.alert('Erro', 'Email ou senha incorretos');
                setLoading(false);
                return;
            }

            // Login realizado com sucesso
            Alert.alert('Sucesso', 'Login realizado com sucesso!');
            await loginUser(email); // Armazena o usuário no contexto ou AsyncStorage

            if (userData.admin === true || userData.admin === 'true') {
                // Se for admin, vai para PageGeral
                navigation.navigate('PageGeral');
            } else {
                // Se não for admin, vai para CheckPoint
                navigation.navigate('CheckPoint');
            }

            } catch (err) {
            console.error('Erro no login:', err);
            Alert.alert('Erro', 'Não foi possível realizar o login');
            } finally {
            setLoading(false);
            }
        } else {
            Alert.alert('Erro', 'Por favor, preencha todos os campos.');
            setLoading(false);
        }
    };


    return (
        <View style={tw`flex-1 bg-gray-100 justify-center p-6`}>
            {/* Título */}
            <Text style={tw`text-3xl font-bold text-center text-black mb-8`}>Login do Controlador</Text>

            {/* Campo Email */}
            <TextInput
                style={tw`border border-gray-300 bg-white rounded-lg px-4 py-3 mb-4 text-black`}
                placeholder="Email"
                placeholderTextColor="#888888"
                value={email}
                onChangeText={setEmail}       
            />

            {/* Campo Senha */}
            <TextInput
                style={tw`border border-gray-300 bg-white rounded-lg px-4 py-3 mb-6 text-black`}
                placeholder="Senha"
                placeholderTextColor="#888888"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            {/* Botão Entrar */}
            <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                style={tw`bg-blue-600 rounded-lg p-4 items-center ${loading ? 'opacity-70' : ''}`}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={tw`text-white font-bold text-lg`}>Entrar</Text>
                )}
            </TouchableOpacity>

            {/* Versão do App */}
            <View style={tw`mt-6 items-center`}>
                <Text style={tw`text-gray-400 text-sm`}>Versão 1.0.0</Text>
                <Text style={tw`text-gray-400 text-xs`}>© {year} Sistema Spulse</Text>
            </View>
            
        </View>
    );
};

export default Login;
