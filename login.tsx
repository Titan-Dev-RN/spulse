import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from './services/supabase'; // Importando o cliente Supabase
import { useUserContext } from './UserContext'; // Importando o contexto corretamente
//import { checkpoint } from './checkpoint'; //Importando a página do CheckPoint
import tw from 'tailwind-react-native-classnames';


const Login = () => {
    const [email, setEmail] = useState(''); 
    const [password, setPassword] = useState('');
    const navigation = useNavigation(); 
    const { loginUser } = useUserContext(); // Usar o loginUser do contexto

    const handleLogin = async () => {
        if (email && password) {
            // Verifica se o email existe
            const { data: emailData, error: emailError } = await supabase
                .from('usersSpulse')
                .select('*')
                .eq('email', email);
    
            if (emailError || !emailData || emailData.length === 0) {
                Alert.alert('Erro', 'Email não encontrado');
            } else {
                // Verifica se a senha corresponde ao email fornecido
                const { data: senhaData, error: senhaError } = await supabase
                    .from('usersSpulse')
                    .select('*')
                    .eq('email', email)
                    .eq('senha', password); // Mudança para "senha"
    
                if (senhaError || !senhaData || senhaData.length === 0) {
                    Alert.alert('Erro', 'Senha incorreta');
                } else {
                    Alert.alert('Sucesso', 'Login realizado com sucesso!');
                    await loginUser(email); // Armazena o usuário no contexto
                    navigation.navigate('CheckPoint'); // Redireciona para a tela de checkpoint
                }
            }
        } else {
            Alert.alert('Erro', 'Por favor, preencha todos os campos.');
        }
    };

    return (
        <View style={tw`flex-1 bg-gray-100 justify-center p-6`}>
            {/* Título */}
            <Text style={tw`text-3xl font-bold text-center text-black mb-8`}>Login do Agente</Text>

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
                style={tw`bg-blue-500 rounded-lg p-4 mb-4`}
            >
                <Text style={tw`text-white text-center font-bold`}>Entrar</Text>
            </TouchableOpacity>

            {/* Link para Registro */}
            <View style={tw`flex-row justify-center`}>
                <Text style={tw`text-black`}>Não tem uma conta? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Cadastro')}>
                    <Text style={tw`text-blue-500 font-bold`}>Registre-se aqui</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default Login;
