import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserContext } from './UserContext';
import Icon from 'react-native-vector-icons/Ionicons';
import tw from 'tailwind-react-native-classnames';

const OutrasFuncoes = () => {
    const navigation = useNavigation();
    const { logoutUser, currentUser } = useUserContext();
    const [isAdmin, setIsAdmin] = useState(false);
    const [userPavilion, setUserPavilion] = useState(null);
    const [loading, setLoading] = useState(true);


    const year = new Date().getFullYear();

    // Função para verificar se é admin (você pode adaptar da sua implementação anterior)
    const checkIfUserIsAdmin = async () => {
        try {
            const email = await AsyncStorage.getItem('currentUser');
            console.log('Email do usuário:', email);
            
            if (!email) {
                console.warn('Nenhum email encontrado');
                return false;
            }

            const { data, error } = await supabase
                .from('usersSpulse')
                .select('admin, email') // Adicione email para debug
                .eq('email', email)
                .single();

            //console.log('Dados retornados da consulta:', data);
            //console.log('Erro da consulta:', error);

            if (error) {
                console.error('Erro ao verificar admin:', error);
                return false;
            }

            //console.log('Valor da coluna admin:', data?.admin, 'Tipo:', typeof data?.admin);
            
            // Verifica se é verdadeiro (boolean) ou 'true' (string)
            const isAdmin = data?.admin === true || data?.admin === 'true';
            console.log('Usuário é admin?', isAdmin);
            
            return isAdmin;
        } catch (error) {
            console.error('Erro ao verificar se usuário é admin:', error);
            return false;
        }
    };

    /*
    useEffect(() => {
        const loadAdminStatus = async () => {
            // Verifica se é admin
            const adminStatus = await checkIfUserIsAdmin();
            setIsAdmin(adminStatus);
        };
        loadAdminStatus();
    }, []);
    */

    const loadUserData = async () => {
        try {
            setLoading(true);
            const email = await AsyncStorage.getItem('currentUser');
            
            if (email) {
                // Verifica se é admin
                const adminStatus = await checkIfUserIsAdmin();
                setIsAdmin(adminStatus);
                
                // Busca o pavilhão do usuário
                const pavilion = await fetchUserPavilion(email);
                setUserPavilion(pavilion);
                
                console.log('Pavilhão do usuário:', pavilion);
                
            }
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUserData();
    }, []);

    const makeLogout = async () => {
        try {
            await logoutUser();
            Alert.alert('Logout', 'Logout realizado com sucesso!');
            navigation.navigate('Login');
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            Alert.alert('Erro', 'Não foi possível fazer logout');
        }
    };

    const navigateToDashboard = () => {
        navigation.navigate('ControladorDashboard');
    };

    const navigateToAdminPainel = () => {
        navigation.navigate('AdminPainel');
    };

    const navigateToCadastro = () => {
        navigation.navigate('Cadastro');
    };

    const fetchUserPavilion = async (email) => {
        if (!email) return null;
        
        try {
            const { data } = await supabase
                .from('checkpoints')
                .select('pavilion')
                .eq('user_email', email)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            return data?.pavilion || null;
        } catch (error) {
            console.error('Erro ao buscar pavilhão:', error);
            return null;
        }
    };

    return (
        <View style={tw`flex-1 bg-gray-50 p-6`}>
            {/* Header */}
            <View style={tw`mb-8`}>
                <Text style={tw`text-2xl font-bold text-gray-800 text-center`}>Outras Funções</Text>
                {/* Informações do usuário */}
                <View style={tw`mt-4 bg-white rounded-lg p-4 shadow-sm`}>
                    <Text style={tw`text-gray-700 mb-2`}>
                        <Text style={tw`font-bold`}>Usuário: </Text>
                        {currentUser || 'Usuário'}
                    </Text>
                    
                    {userPavilion && (
                        <Text style={tw`text-gray-700 mb-2`}>
                            <Text style={tw`font-bold`}>Pavilhão: </Text>
                            {userPavilion}
                            {userPavilion === '1' && (
                                <Text style={tw`text-green-600 ml-2`}>• Acesso especial</Text>
                            )}
                        </Text>
                    )}
                    
                    {isAdmin && (
                        <Text style={tw`text-blue-600 font-bold`}>
                            <Icon name="shield-checkmark" size={16} /> Administrador
                        </Text>
                    )}
                </View>
            </View>

            {/* Botões de Navegação */}
            <View style={tw`mb-8`}>
                {/* Dashboard */}
                <TouchableOpacity 
                    onPress={navigateToDashboard}
                    style={tw`bg-blue-600 flex-row items-center rounded-xl p-5 shadow-md my-1`}
                >
                    <Icon name="speedometer" size={24} color="white" style={tw`mr-4`} />
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-lg font-bold text-white`}>Dashboard</Text>
                        <Text style={tw`text-white opacity-90 text-sm`}>
                            Painel principal do controlador
                        </Text>
                    </View>
                    <Icon name="chevron-forward" size={20} color="white" />
                </TouchableOpacity>

                {/* Cadastro de Usuário (apenas admin) */}
                {isAdmin && (
                    <TouchableOpacity 
                        onPress={navigateToCadastro}
                        style={tw`bg-purple-600 flex-row items-center rounded-xl p-5 shadow-md my-1`}
                    >
                        <Icon name="person-add" size={24} color="white" style={tw`mr-4`} />
                        <View style={tw`flex-1`}>
                            <Text style={tw`text-lg font-bold text-white`}>Cadastrar Usuário</Text>
                            <Text style={tw`text-white opacity-90 text-sm`}>
                                Registrar novo controlador
                            </Text>
                        </View>
                        <Icon name="chevron-forward" size={20} color="white" />
                    </TouchableOpacity>
                )}

                {/* Cadastro de Pavilhões e Rotas de Checkpoints (apenas admin) */}
                {isAdmin && (
                    <TouchableOpacity 
                        onPress={navigateToAdminPainel}
                        style={tw`bg-black flex-row items-center rounded-xl p-5 shadow-md my-1`}
                    >
                        <Icon name="business" size={24} color="white" style={tw`mr-4`} />
                        <View style={tw`flex-1`}>
                            <Text style={tw`text-lg font-bold text-white`}>Cadastrar Pavilhões</Text>
                            <Text style={tw`text-white opacity-90 text-sm`}>
                                Registrar novos pavilhões e rotas
                            </Text>
                        </View>
                        <Icon name="chevron-forward" size={20} color="white" />
                    </TouchableOpacity>
                )}

                {userPavilion && userPavilion.toString() === '1' && (
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('RegistrarVisitante')}
                        style={tw`bg-green-600 flex-row items-center rounded-xl p-5 shadow-md my-1`}
                    >
                        <Icon name="person-add" size={24} color="white" style={tw`mr-3`} />
                        <View style={tw`flex-1`}>
                            <Text style={tw`text-lg font-bold text-white`}>Novo Visitante</Text>
                            <Text style={tw`text-white opacity-90 text-sm`}>Cadastrar novo visitante</Text>
                        </View>
                        <Icon name="chevron-forward" size={20} color="white" />
                    </TouchableOpacity>
                )}


                {/* Ajuda (exemplo) */}
                <TouchableOpacity 
                    onPress={() => navigation.navigate('Agendamento')}
                    style={tw`bg-pink-600 flex-row items-center rounded-xl p-5 shadow-md my-1`}
                >
                    <Icon name="help-circle" size={24} color="white" style={tw`mr-4`} />
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-lg font-bold text-white`}>Agendamento de visitantes</Text>
                        <Text style={tw`text-white opacity-90 text-sm`}>
                            Faça o agendamento de uma visita
                        </Text>
                    </View>
                    <Icon name="chevron-forward" size={20} color="white" />
                </TouchableOpacity>

                {/* Ajuda (exemplo) */}
                <TouchableOpacity 
                    onPress={() => Alert.alert('Ajuda', 'Entre em contato com o suporte')}
                    style={tw`bg-indigo-600 flex-row items-center rounded-xl p-5 shadow-md my-1`}
                >
                    <Icon name="help-circle" size={24} color="white" style={tw`mr-4`} />
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-lg font-bold text-white`}>Ajuda & Suporte</Text>
                        <Text style={tw`text-white opacity-90 text-sm`}>
                            Precisa de ajuda? Clique aqui
                        </Text>
                    </View>
                    <Icon name="chevron-forward" size={20} color="white" />
                </TouchableOpacity>
            </View>


            {/* Logout */}
            <View style={tw`mt-auto`}>
                <TouchableOpacity 
                    onPress={makeLogout}
                    style={tw`bg-red-600 flex-row items-center rounded-xl p-5 shadow-md`}
                >
                    <Icon name="log-out" size={24} color="white" style={tw`mr-4`} />
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-lg font-bold text-white`}>Sair do Sistema</Text>
                        <Text style={tw`text-white opacity-90 text-sm`}>
                            Encerrar sua sessão
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Back Button */}
            <TouchableOpacity
                onPress={() => navigation.navigate('PageGeral')}
                style={tw`mt-4 bg-gray-300 rounded-lg p-4`}
            >
                <Text style={tw`text-gray-800 font-medium text-center`}>Voltar</Text>
            </TouchableOpacity>
            

            {/* Versão do App */}
            <View style={tw`mt-6 items-center`}>
                <Text style={tw`text-gray-400 text-sm`}>Versão 1.0.0</Text>
                <Text style={tw`text-gray-400 text-xs`}>© {year} Sistema Spulse</Text>
            </View>
        </View>
    );
};

export default OutrasFuncoes;