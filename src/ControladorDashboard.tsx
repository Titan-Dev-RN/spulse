import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import tw from 'tailwind-react-native-classnames';
import { LineChart, PieChart } from 'react-native-chart-kit';

const ControladorDashboard = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalVisitors: 0,
        todayVisitors: 0,
        currentPavilion: null,
        recentCheckpoints: 0,
        admin: false
    });
    const [userEmail, setUserEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [visitorsLast7Days, setVisitorsLast7Days] = useState([]);
    const [checkpointsByPavilion, setCheckpointsByPavilion] = useState([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const email = await AsyncStorage.getItem('currentUser');
            if (!email) return;
            setUserEmail(email);

            const isAdmin = await checkIfUserIsAdmin(email);
            const [visitorStats, currentPavilion, recentCheckpoints, last7DaysData, pavilionStats] = await Promise.all([
                fetchVisitorsStats(),
                isAdmin ? null : fetchUserPavilion(email),
                fetchRecentCheckpoints(),
                fetchVisitorsLast7Days(),
                fetchCheckpointsByPavilion(),
            ]);

            setStats({
                totalVisitors: visitorStats.total,
                todayVisitors: visitorStats.today,
                currentPavilion,
                recentCheckpoints,
                admin: isAdmin,
            });

            setVisitorsLast7Days(last7DaysData);
            setCheckpointsByPavilion(pavilionStats);

            // Buscar nome do usuário
            const { data: userData } = await supabase
                .from('usersSpulse')
                .select('name')
                .eq('email', email)
                .single();
            setUserName(userData?.name || '');
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            Alert.alert('Erro', 'Não foi possível carregar os dados do dashboard');
        } finally {
            setLoading(false);
        }
    };

    const fetchVisitorsLast7Days = async () => {
        try {
            const dates = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                dates.push(date.toISOString().split('T')[0]);
            }

            const visitorsByDay = [];
            
            for (const date of dates) {
                const { count } = await supabase
                    .from('visitors')
                    .select('*', { count: 'exact' })
                    .eq('created_at', date);
                
                visitorsByDay.push(count || 0);
            }

            return visitorsByDay;
        } catch (error) {
            console.error('Erro ao buscar dados de visitantes:', error);
            return [0, 0, 0, 0, 0, 0, 0];
        }
    };

    const fetchCheckpointsByPavilion = async () => {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data, error } = await supabase
                .from('agent_checkpoints')
                .select('pavilion_id (name)')
                .gte('created_at', sevenDaysAgo.toISOString());

            if (error) throw error;

            const counts = {};
            data.forEach(item => {
                const name = item.pavilion_id?.name || 'Desconhecido';
                counts[name] = (counts[name] || 0) + 1;
            });

            // Gerar cores consistentes
            const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'];
            
            return Object.keys(counts).map((key, index) => ({
                name: key,
                count: counts[key],
                color: colors[index % colors.length],
                legendFontColor: '#7F7F7F',
                legendFontSize: 12,
            }));
        } catch (error) {
            console.error('Erro ao buscar checkpoints por pavilhão:', error);
            return [];
        }
    };

    const fetchVisitorsStats = async () => {
        try {
            // Total de visitantes
            const { count: total, error: totalError } = await supabase
                .from('visitors')
                .select('*', { count: 'exact' });

            if (totalError) throw totalError;

            // Visitantes de hoje
            const today = new Date().toISOString().split('T')[0];
            const { count: todayCount, error: todayError } = await supabase
                .from('visitors')
                .select('*', { count: 'exact' })
                .eq('created_at', today);

            if (todayError) throw todayError;

            return { total: total || 0, today: todayCount || 0 };
        } catch (error) {
            console.error('Erro ao buscar estatísticas de visitantes:', error);
            return { total: 0, today: 0 };
        }
    };

    const fetchUserPavilion = async (email) => {
        try {
            const { data, error } = await supabase
                .from('agent_checkpoints')
                .select('pavilion_id (name)')
                .eq('user_email', email)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error) throw error;
            return data?.pavilion_id?.name || null;
        } catch (error) {
            console.error('Erro ao buscar pavilhão:', error);
            return null;
        }
    };

    const checkIfUserIsAdmin = async (email) => {
        if (!email) return false;
        
        try {
            const { data, error } = await supabase
                .from('usersSpulse')
                .select('admin')
                .eq('email', email)
                .single();

            if (error) throw error;
            return data?.admin === true || data?.admin === 'true';
        } catch (error) {
            console.error('Erro ao verificar admin:', error);
            return false;
        }
    };

    const fetchRecentCheckpoints = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { count, error } = await supabase
                .from('agent_checkpoints')
                .select('*', { count: 'exact' })
                .eq('date', today);

            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Erro ao buscar checkpoints recentes:', error);
            return 0;
        }
    };

    if (loading) {
        return (
            <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={tw`mt-4 text-gray-600`}>Carregando dashboard...</Text>
            </View>
        );
    }

    return (
        <View style={tw`flex-1 bg-gray-50`}>
            {/* Header */}
            <View style={tw`bg-white p-6 shadow-sm`}>
                <View style={tw`flex-row justify-between items-center`}>
                    <View>
                        <Text style={tw`text-2xl font-bold text-gray-800`}>
                            {stats.admin ? 'Dashboard do Administrador' : 'Dashboard do Controlador'}
                        </Text>
                        <Text style={tw`text-gray-500`}>Bem-vindo, {userName || userEmail}</Text>
                    </View>
                    <TouchableOpacity onPress={loadDashboardData}>
                        <Icon name="refresh" size={24} color="#3B82F6" />
                    </TouchableOpacity>
                </View>
                
                {!stats.admin && stats.currentPavilion && (
                    <View style={tw`mt-3 flex-row items-center bg-blue-50 p-3 rounded-lg`}>
                        <Icon name="business" size={20} color="#3B82F6" />
                        <Text style={tw`ml-2 text-blue-700`}>
                            Pavilhão atual: {stats.currentPavilion}
                        </Text>
                    </View>
                )}
                
                {stats.admin && (
                    <View style={tw`mt-3 flex-row items-center bg-purple-50 p-3 rounded-lg`}>
                        <Icon name="shield" size={20} color="#8B5CF6" />
                        <Text style={tw`ml-2 text-purple-700`}>
                            Modo Administrador - Acesso completo ao sistema
                        </Text>
                    </View>
                )}
            </View>

            <ScrollView contentContainerStyle={tw`p-4`}>
                {/* Estatísticas */}
                <View style={tw`mb-6`}>
                    <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>Estatísticas</Text>
                    
                    <View style={tw`flex-row flex-wrap justify-between`}>
                        {/* Total de Visitantes */}
                        <View style={tw`w-[48%] bg-white rounded-xl p-4 shadow-sm mb-4`}>
                            <View style={tw`flex-row items-center mb-2`}>
                                <Icon name="people" size={20} color="#10B981" />
                                <Text style={tw`ml-2 text-sm text-gray-500`}>Total Visitantes</Text>
                            </View>
                            <Text style={tw`text-2xl font-bold text-gray-800`}>{stats.totalVisitors}</Text>
                        </View>

                        {/* Visitantes Hoje */}
                        <View style={tw`w-[48%] bg-white rounded-xl p-4 shadow-sm mb-4`}>
                            <View style={tw`flex-row items-center mb-2`}>
                                <Icon name="today" size={20} color="#F59E0B" />
                                <Text style={tw`ml-2 text-sm text-gray-500`}>Visitantes Hoje</Text>
                            </View>
                            <Text style={tw`text-2xl font-bold text-gray-800`}>{stats.todayVisitors}</Text>
                        </View>

                        {/* Checkpoints Hoje */}
                        <View style={tw`w-[48%] bg-white rounded-xl p-4 shadow-sm`}>
                            <View style={tw`flex-row items-center mb-2`}>
                                <Icon name="checkmark-circle" size={20} color="#3B82F6" />
                                <Text style={tw`ml-2 text-sm text-gray-500`}>Checkpoints Hoje</Text>
                            </View>
                            <Text style={tw`text-2xl font-bold text-gray-800`}>{stats.recentCheckpoints}</Text>
                        </View>

                        {/* Status Admin */}
                        <View style={tw`w-[48%] bg-white rounded-xl p-4 shadow-sm`}>
                            <View style={tw`flex-row items-center mb-2`}>
                                <Icon name="shield" size={20} color={stats.admin ? "#10B981" : "#6B7280"} />
                                <Text style={tw`ml-2 text-sm text-gray-500`}>Status</Text>
                            </View>
                            <Text style={tw`text-lg font-bold ${stats.admin ? 'text-green-600' : 'text-gray-600'}`}>
                                {stats.admin ? 'Administrador' : 'Controlador'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Novos Gráficos */}
                <View style={tw`mb-6`}>
                    <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>Visualizações</Text>
                    
                    {/* Gráfico de Visitantes dos Últimos 7 Dias */}
                    <View style={tw`bg-white rounded-xl p-4 shadow-sm mb-4`}>
                        <Text style={tw`font-medium text-gray-800 mb-2`}>Visitantes dos Últimos 7 Dias</Text>
                        <LineChart
                            data={{
                                labels: ['6d', '5d', '4d', '3d', '2d', 'Ontem', 'Hoje'],
                                datasets: [
                                    {
                                        data: visitorsLast7Days,
                                    },
                                ],
                            }}
                            width={Dimensions.get('window').width - 48}
                            height={220}
                            yAxisLabel=""
                            chartConfig={{
                                backgroundColor: '#ffffff',
                                backgroundGradientFrom: '#ffffff',
                                backgroundGradientTo: '#ffffff',
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                                style: {
                                    borderRadius: 16,
                                },
                                propsForDots: {
                                    r: '4',
                                    strokeWidth: '2',
                                    stroke: '#3B82F6',
                                },
                            }}
                            bezier
                            style={tw`rounded-xl`}
                        />
                    </View>

                    {/* Gráfico de Checkpoints por Pavilhão */}
                    {checkpointsByPavilion.length > 0 && (
                        <View style={tw`bg-white rounded-xl p-4 shadow-sm`}>
                            <Text style={tw`font-medium text-gray-800 mb-2`}>Checkpoints por Pavilhão (7 dias)</Text>
                            <PieChart
                                data={checkpointsByPavilion}
                                width={Dimensions.get('window').width - 48}
                                height={180}
                                chartConfig={{
                                    backgroundColor: '#ffffff',
                                    backgroundGradientFrom: '#ffffff',
                                    backgroundGradientTo: '#ffffff',
                                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                }}
                                accessor="count"
                                backgroundColor="transparent"
                                paddingLeft="15"
                                absolute
                            />
                        </View>
                    )}
                </View>

                {/* Ações Rápidas */}
                <View style={tw`mb-6`}>
                    <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>Ações Rápidas</Text>
                    
                    <View style={tw`space-y-3`}>
                        {/* Gerenciar Visitantes */}
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('PageGeral')}
                            style={tw`bg-white rounded-xl p-4 shadow-sm flex-row items-center my-1`}
                        >
                            <Icon name="people-outline" size={24} color="#3B82F6" style={tw`mr-3`} />
                            <View style={tw`flex-1`}>
                                <Text style={tw`font-medium text-gray-800`}>Gerenciar Visitantes</Text>
                                <Text style={tw`text-sm text-gray-500`}>Ver e editar todos os visitantes</Text>
                            </View>
                            <Icon name="chevron-forward" size={20} color="#9CA3AF" />
                        </TouchableOpacity>

                        {/* Registrar Checkpoints */}
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('MarcarCheckpoints')}
                            style={tw`bg-white rounded-xl p-4 shadow-sm flex-row items-center my-1`}
                        >
                            <Icon name="checkmark-circle-outline" size={24} color="#10B981" style={tw`mr-3`} />
                            <View style={tw`flex-1`}>
                                <Text style={tw`font-medium text-gray-800`}>Registrar Checkpoints</Text>
                                <Text style={tw`text-sm text-gray-500`}>Marcar passagem de visitantes</Text>
                            </View>
                            <Icon name="chevron-forward" size={20} color="#9CA3AF" />
                        </TouchableOpacity>

                        {/* Controlar Agendamentos */}
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('VisitasAgendadas')}
                            style={tw`bg-white rounded-xl p-4 shadow-sm flex-row items-center my-1`}
                        >
                            <Icon name="calendar-outline" size={24} color="#6366F1" style={tw`mr-3`} />
                            <View style={tw`flex-1`}>
                                <Text style={tw`font-medium text-gray-800`}>Controlar Agendamentos</Text>
                                <Text style={tw`text-sm text-gray-500`}>Gerencie os Agendamentos dos Visitantes</Text>
                            </View>
                            <Icon name="chevron-forward" size={20} color="#9CA3AF" />
                        </TouchableOpacity>

                        {/* Novo Visitante */}
                        {(stats.admin || stats.currentPavilion?.toString() === '1') && (
                            <TouchableOpacity 
                                onPress={() => navigation.navigate('RegistrarVisitante')}
                                style={tw`bg-white rounded-xl p-4 shadow-sm flex-row items-center my-1`}
                            >
                                <Icon name="person-add" size={24} color="#F59E0B" style={tw`mr-3`} />
                                <View style={tw`flex-1`}>
                                    <Text style={tw`font-medium text-gray-800`}>Novo Visitante</Text>
                                    <Text style={tw`text-sm text-gray-500`}>Cadastrar novo visitante</Text>
                                </View>
                                <Icon name="chevron-forward" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}

                        {/* Gerenciar Usuários (Admin only) */}
                        {stats.admin && (
                            <TouchableOpacity 
                                onPress={() => navigation.navigate('Cadastro')}
                                style={tw`bg-white rounded-xl p-4 shadow-sm flex-row items-center my-1`}
                            >
                                <Icon name="shield-outline" size={24} color="#8B5CF6" style={tw`mr-3`} />
                                <View style={tw`flex-1`}>
                                    <Text style={tw`font-medium text-gray-800`}>Gerenciar Usuários</Text>
                                    <Text style={tw`text-sm text-gray-500`}>Cadastrar novos controladores</Text>
                                </View>
                                <Icon name="chevron-forward" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity 
                            onPress={() => navigation.navigate('Agendamento')}
                            style={tw`bg-white rounded-xl p-4 shadow-sm flex-row items-center my-1`}
                        >
                            <Icon name="person-add" size={24} color="#F59E0B" style={tw`mr-3`} />
                            <View style={tw`flex-1`}>
                                <Text style={tw`font-medium text-gray-800`}>Agendar Visitas</Text>
                                <Text style={tw`text-sm text-gray-500`}>Programar as visitas dos Visitantes</Text>
                            </View>
                            <Icon name="chevron-forward" size={20} color="#9CA3AF" />
                        </TouchableOpacity>

                        {/* NFC Management */}
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('PageGeral')}
                            style={tw`bg-white rounded-xl p-4 shadow-sm flex-row items-center my-1`}
                        >
                            <Icon name="hardware-chip" size={24} color="#6366F1" style={tw`mr-3`} />
                            <View style={tw`flex-1`}>
                                <Text style={tw`font-medium text-gray-800`}>Gerenciar NFC</Text>
                                <Text style={tw`text-sm text-gray-500`}>Ler e gravar pulseiras NFC</Text>
                            </View>
                            <Icon name="chevron-forward" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Status do Sistema */}
                <View style={tw`mb-6`}>
                    <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>Status do Sistema</Text>
                    
                    <View style={tw`bg-white rounded-xl p-4 shadow-sm`}>
                        <View style={tw`flex-row justify-between items-center mb-3`}>
                            <Text style={tw`text-gray-600`}>Conexão com Banco</Text>
                            <View style={tw`flex-row items-center`}>
                                <View style={tw`w-3 h-3 bg-green-500 rounded-full mr-2`} />
                                <Text style={tw`text-green-600 font-medium`}>Online</Text>
                            </View>
                        </View>
                        
                        <View style={tw`flex-row justify-between items-center mb-3`}>
                            <Text style={tw`text-gray-600`}>Dispositivo NFC</Text>
                            <View style={tw`flex-row items-center`}>
                                <View style={tw`w-3 h-3 bg-green-500 rounded-full mr-2`} />
                                <Text style={tw`text-green-600 font-medium`}>Disponível</Text>
                            </View>
                        </View>
                        
                        <View style={tw`flex-row justify-between items-center`}>
                            <Text style={tw`text-gray-600`}>Última atualização</Text>
                            <Text style={tw`text-gray-600`}>{new Date().toLocaleTimeString()}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Back Button */}
            <TouchableOpacity
                onPress={() => navigation.navigate('PageGeral')}
                style={tw`m-4 bg-gray-300 rounded-lg p-4`}
            >
                <Text style={tw`text-gray-800 font-medium text-center`}>Voltar</Text>
            </TouchableOpacity>
        </View>
    );
};

export default ControladorDashboard;