import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabase'; // Certifique-se de que o cliente Supabase está configurado corretamente
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import tw from 'tailwind-react-native-classnames';
import Icon from 'react-native-vector-icons/Ionicons';

const CadastroSpulse = () => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [cpf, setCpf] = useState('');
    const navigation = useNavigation();

    // Regex para validações
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}\-\d{2}$/;

    // Formata o CPF enquanto digita (xxx.xxx.xxx-xx)
    const formatCPF = (value) => {
        const numericValue = value.replace(/\D/g, '');
        
        if (numericValue.length <= 3) return numericValue;
        if (numericValue.length <= 6) return `${numericValue.slice(0, 3)}.${numericValue.slice(3)}`;
        if (numericValue.length <= 9) return `${numericValue.slice(0, 3)}.${numericValue.slice(3, 6)}.${numericValue.slice(6)}`;
        
        return `${numericValue.slice(0, 3)}.${numericValue.slice(3, 6)}.${numericValue.slice(6, 9)}-${numericValue.slice(9, 11)}`;
    };

    const handleCpfChange = (text) => {
        const formattedCpf = formatCPF(text);
        setCpf(formattedCpf);
    };

    const handleCadastro = async () => {
        // Validações
        if (!email || !password || !name || !cpf) {
            Alert.alert('Atenção', 'Por favor, preencha todos os campos.');
            return;
        }

        if (!emailRegex.test(email)) {
            Alert.alert('Atenção', 'Por favor, insira um email válido.');
            return;
        }

        if (!cpfRegex.test(cpf)) {
            Alert.alert('Atenção', 'Por favor, insira um CPF válido (formato: 000.000.000-00).');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('usersSpulse')
                .insert([{ name, email, senha: password, cpf }]);

            if (error) {
                throw error;
            }

            Alert.alert('Sucesso', 'Cadastro realizado com sucesso!');
            setName('');
            setEmail('');
            setPassword('');
            setCpf('');
            navigation.navigate('OutrasFuncoes');
        } catch (error) {
            console.error('Erro ao cadastrar:', error);
            Alert.alert('Erro', error.message || 'Falha ao realizar o cadastro.');
        } finally {
            setLoading(false);
        }
    };

     return (
        <ScrollView contentContainerStyle={tw`flex-grow bg-gray-50 p-6`}>
            <View style={tw`max-w-md w-full mx-auto`}>
                {/* Header */}
                <View style={tw`mb-10`}>
                    <Text style={tw`text-3xl font-bold text-center text-gray-800 mb-2`}>Crie uma conta</Text>
                    <Text style={tw`text-center text-gray-500`}>Preencha os dados para cadastrar um novo usuário</Text>
                </View>

                {/* Formulário */}
                <View style={tw`bg-white rounded-xl shadow-md p-6 mb-6`}>
                    {/* Campo Nome */}
                    <View style={tw`mb-4`}>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>Nome completo</Text>
                        <View style={tw`flex-row items-center border border-gray-300 rounded-lg px-3`}>
                            <Icon name="person-outline" size={20} color="#6B7280" style={tw`mr-2`} />
                            <TextInput
                                style={tw`flex-1 h-12 text-gray-800`}
                                placeholder="Digite seu nome"
                                placeholderTextColor="#9CA3AF"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    </View>

                    {/* Campo CPF */}
                    <View style={tw`mb-6`}>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>CPF</Text>
                        <View style={tw`flex-row items-center border ${cpf && !cpfRegex.test(cpf) ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3`}>
                            <Icon name="id-card-outline" size={20} color="#6B7280" style={tw`mr-2`} />
                            <TextInput
                                style={tw`flex-1 h-12 text-gray-800`}
                                placeholder="000.000.000-00"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="numeric"
                                value={cpf}
                                onChangeText={handleCpfChange}
                                maxLength={14}
                            />
                        </View>
                        {cpf && !cpfRegex.test(cpf) && (
                            <Text style={tw`text-red-500 text-xs mt-1`}>Formato inválido (use: 000.000.000-00)</Text>
                        )}
                    </View>

                    {/* Campo Email */}
                    <View style={tw`mb-4`}>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>Email</Text>
                        <View style={tw`flex-row items-center border ${email && !emailRegex.test(email) ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3`}>
                            <Icon name="mail-outline" size={20} color="#6B7280" style={tw`mr-2`} />
                            <TextInput
                                style={tw`flex-1 h-12 text-gray-800`}
                                placeholder="exemplo@email.com"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>
                        {email && !emailRegex.test(email) && (
                            <Text style={tw`text-red-500 text-xs mt-1`}>Formato de email inválido</Text>
                        )}
                    </View>

                    {/* Campo Senha */}
                    <View style={tw`mb-4`}>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>Senha</Text>
                        <View style={tw`flex-row items-center border ${password.length > 0 && password.length < 6 ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3`}>
                            <Icon name="lock-closed-outline" size={20} color="#6B7280" style={tw`mr-2`} />
                            <TextInput
                                style={tw`flex-1 h-12 text-gray-800`}
                                placeholder="Mínimo 6 caracteres"
                                placeholderTextColor="#9CA3AF"
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Icon 
                                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                                    size={20} 
                                    color="#6B7280" 
                                />
                            </TouchableOpacity>
                        </View>
                        {password.length > 0 && password.length < 6 && (
                            <Text style={tw`text-red-500 text-xs mt-1`}>A senha deve ter pelo menos 6 caracteres</Text>
                        )}
                    </View>


                    {/* Botão de Cadastro */}
                    <TouchableOpacity
                        onPress={handleCadastro}
                        disabled={loading}
                        style={tw`bg-blue-600 rounded-lg p-4 items-center ${loading ? 'opacity-70' : ''}`}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={tw`text-white font-bold text-lg`}>Cadastrar</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Back Button */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('ControladorDashboard')}
                    style={tw`mt-4 bg-gray-200 rounded-lg p-4`}
                >
                    <Text style={tw`text-gray-800 font-medium text-center`}>Voltar</Text>
                </TouchableOpacity>

            </View>
        </ScrollView>
    );
};

export default CadastroSpulse;
