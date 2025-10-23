import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Image, Button, StyleSheet, Alert, ScrollView, TouchableOpacity, ActivityIndicator, PermissionsAndroid, Platform, Modal, Linking } from 'react-native';
import NfcManager, { NfcTech, Ndef, NfcEvents } from 'react-native-nfc-manager';
import { useNavigation } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import { supabase } from '../services/supabase';
import { WebView } from 'react-native-webview';
import tw from 'tailwind-react-native-classnames';
import Icon from 'react-native-vector-icons/Ionicons';
import { checkAndAlertOverdueVisits, startOverdueCheckInterval } from '../functions/visitas_estouradas';

const ProntuarioScreen = ({ route }) => {
    const { id } = route.params;
    console.log('ID recebido:', id);

    const [visitorData, setVisitorData] = useState(null);
    const [mapUrl, setMapUrl] = useState({ latitude: null, longitude: null });
    const [modalVisible, setModalVisible] = useState(false);
    const [currentLatitude, setCurrentLatitude] = useState('');
    const [currentLongitude, setCurrentLongitude] = useState('');
    const [plannedCheckpoints, setPlannedCheckpoints] = useState([]);
    const [completedCheckpoints, setCompletedCheckpoints] = useState([]);
    const [loadingCheckpoints, setLoadingCheckpoints] = useState(false);
    const [activeTab, setActiveTab] = useState('realizados');
    const [visitDuration, setVisitDuration] = useState('');

    const [isVisitOverdue, setIsVisitOverdue] = useState(false);
    const [overdueAlertShown, setOverdueAlertShown] = useState(false);

    const navigation = useNavigation();

    useEffect(() => {
        if (id) {
            fetchVisitor();
            fetchCheckpoints();
            checkVisitStatus();
        } else {
            Alert.alert('Erro', 'ID do prontuário não fornecido.');
        }
    }, [id]);

    // Função para verificar se a visita está atrasada
    const checkVisitStatus = async () => {
        try {
            // Buscar informações da visita atual/agendada
            const { data: visitData, error } = await supabase
                .from('visitor_agendamento')
                .select(`
                    *,
                    scheduled_checkpoints (
                        id,
                        tempo_estimado,
                        order_number
                    )
                `)
                .eq('visitor_id', id)
                .eq('status', 'em_andamento') // ou outro status que indique visita em andamento
                .order('scheduled_date', { ascending: false })
                .limit(1);

            if (error) throw error;

            if (visitData && visitData.length > 0) {
                const currentVisit = visitData[0];
                const isOverdue = await checkAndAlertOverdueVisits([currentVisit], false);
                
                setIsVisitOverdue(isOverdue);
                
                // Mostrar alerta apenas uma vez
                if (isOverdue && !overdueAlertShown) {
                    showOverdueAlert();
                    setOverdueAlertShown(true);
                }
            }
        } catch (error) {
            console.error('Erro ao verificar status da visita:', error);
        }
    };

    const showOverdueAlert = () => {
        Alert.alert(
            'Visita Atrasada ⚠️',
            'Esta visita está atrasada em relação ao tempo estimado. Verifique os checkpoints pendentes.',
            [
                {
                    text: 'Entendi',
                    style: 'default'
                },
                {
                    text: 'Ver Detalhes',
                    onPress: () => setActiveTab('planejados')
                }
            ]
        );
    };


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

    const fetchCheckpoints = async () => {
        if (!id) return;

        try {
            setLoadingCheckpoints(true);

            // Buscar checkpoints realizados
            const { data: completedData, error: completedError } = await supabase
                .from('visitor_checkpoints')
                .select('*')
                .eq('visitor_id', id)
                .order('timestamp', { ascending: false });

            if (completedError) throw completedError;

            // Buscar checkpoints planejados (agendamentos)
            const { data: plannedData, error: plannedError } = await supabase
                .from('visitor_agendamento')
                .select(`
                    *,
                    routes:route_id (name_route),
                    scheduled_checkpoints (
                        id,
                        created_at,
                        pavilion,
                        tempo_estimado,
                        order_number,
                        notes
                    )
                `)
                .eq('visitor_id', id)
                .order('scheduled_date', { ascending: false });

            if (plannedError) throw plannedError;

            // Buscar todos os pavilhões para fazer a correlação manual
            const { data: pavilionsData, error: pavilionsError } = await supabase
                .from('pavilions')
                .select('id, name');

            if (pavilionsError) throw pavilionsError;

            // Criar um mapa de pavilhões para busca rápida
            const pavilionsMap = {};
            pavilionsData?.forEach(pavilion => {
                pavilionsMap[pavilion.id] = pavilion.name;
            });

            setCompletedCheckpoints(completedData || []);
            
            // Processar checkpoints planejados com ordenação
            const allPlannedCheckpoints = [];
            let totalDuration = '';
            
            plannedData?.forEach(agendamento => {
                // Ordenar checkpoints pelo order_number
                const sortedCheckpoints = agendamento.scheduled_checkpoints?.sort((a, b) => 
                    (a.order_number || 0) - (b.order_number || 0)
                ) || [];

                sortedCheckpoints?.forEach(checkpoint => {
                    // Tentar extrair o ID do pavilhão do campo pavilion (que pode ser o ID ou nome)
                    let pavilionId = null;
                    let pavilionName = checkpoint.pavilion;
                    
                    // Se o campo pavilion for numérico, provavelmente é um ID
                    if (checkpoint.pavilion && !isNaN(checkpoint.pavilion)) {
                        pavilionId = parseInt(checkpoint.pavilion);
                        pavilionName = pavilionsMap[pavilionId] || checkpoint.pavilion;
                    }
                    // Se não for numérico, usar diretamente como nome
                    else {
                        pavilionName = checkpoint.pavilion;
                    }

                    allPlannedCheckpoints.push({
                        ...checkpoint,
                        agendamento_id: agendamento.id,
                        route_name: agendamento.routes?.name_route,
                        scheduled_date: agendamento.scheduled_date,
                        scheduled_time: agendamento.scheduled_time,
                        expected_duration: agendamento.expected_duration,
                        pavilion_name: pavilionName,
                        pavilion_id: pavilionId
                    });
                });

                // Pegar a duração estimada do agendamento
                if (agendamento.expected_duration && !totalDuration) {
                    totalDuration = agendamento.expected_duration;
                }
            });
            
            setPlannedCheckpoints(allPlannedCheckpoints);
            setVisitDuration(totalDuration);

        } catch (error) {
            console.error('Erro ao buscar checkpoints:', error);
            Alert.alert('Erro', 'Não foi possível carregar os checkpoints.');
        } finally {
            setLoadingCheckpoints(false);
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
        setModalVisible(true);
    };

    const formatDateTime = (dateString) => {
        try {
            // Para timestamptz, criar a data diretamente
            const date = new Date(dateString);
            
            // Verificar se a data é válida
            if (isNaN(date.getTime())) {
                return dateString;
            }
            
            return date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    // E também a função formatTime para o mesmo padrão:
    const formatTime = (dateString) => {
        try {
            const date = new Date(dateString);
            
            if (isNaN(date.getTime())) {
                return dateString;
            }
            
            return date.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        } catch {
            return dateString;
        }
    };

    const formatTimeDuration = (timeString) => {
        if (!timeString) return '';
        
        try {
            // Remove segundos se existirem
            const timeParts = timeString.split(':');
            if (timeParts.length >= 2) {
                return `${timeParts[0]}h${timeParts[1]}min`;
            }
            return timeString;
        } catch {
            return timeString;
        }
    };

    const renderCheckpointItem = (checkpoint, index, isCompleted = true) => {
        // Para checkpoints planejados, usar pavilion_name (com correlação)
        // Para checkpoints realizados, usar pavilion diretamente (já que é texto)
        const pavilionName = isCompleted 
            ? checkpoint.pavilion 
            : (checkpoint.pavilion_name || checkpoint.pavilion);
        
        return (
            <View 
                key={checkpoint.id || `${checkpoint.agendamento_id}-${index}`}
                style={tw`p-3 border-b border-gray-100 ${isCompleted ? 'bg-green-50' : 'bg-blue-50'}`}
            >
                <View style={tw`flex-row justify-between items-start mb-1`}>
                    <View style={tw`flex-1`}>
                        <Text style={tw`font-semibold text-gray-800`}>
                            {pavilionName || 'Pavilhão não informado'}
                        </Text>
                    </View>
                    
                    <View style={tw`flex-row items-center`}>
                        {!isCompleted && checkpoint.order_number !== null && (
                            <View style={tw`bg-red-100 px-2 py-1 rounded-full mr-2`}>
                                <Text style={tw`text-xs text-red-800 font-bold`}>
                                    #{checkpoint.order_number}
                                </Text>
                            </View>
                        )}
                        
                        {isCompleted ? (
                            <View style={tw`bg-green-100 px-2 py-1 rounded-full`}>
                                <Text style={tw`text-xs text-green-800 font-medium`}>
                                    Realizado
                                </Text>
                            </View>
                        ) : (
                            <View style={tw`bg-blue-100 px-2 py-1 rounded-full`}>
                                <Text style={tw`text-xs text-blue-800 font-medium`}>
                                    Planejado
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {isCompleted ? (
                    <>
                        <View style={tw`flex-row items-center mb-1`}>
                            <Icon name="time" size={12} color="#6B7280" style={tw`mr-2`} />
                            <Text style={tw`text-xs text-gray-600`}>
                                {formatDateTime(checkpoint.timestamp || checkpoint.time || checkpoint.created_at)}
                            </Text>
                        </View>
                    </>
                ) : (
                    <>
                        <View style={tw`flex-row items-center mb-1`}>
                            <Icon name="calendar" size={12} color="#6B7280" style={tw`mr-2`} />
                            <Text style={tw`text-xs text-gray-600`}>
                                Data: {formatDate(checkpoint.scheduled_date)}
                            </Text>
                        </View>
                        {checkpoint.scheduled_time && (
                            <View style={tw`flex-row items-center mb-1`}>
                                <Icon name="time" size={12} color="#6B7280" style={tw`mr-2`} />
                                <Text style={tw`text-xs text-gray-600`}>
                                    Hora: {formatTime(checkpoint.scheduled_time)}
                                </Text>
                            </View>
                        )}
                        {checkpoint.route_name && (
                            <View style={tw`flex-row items-center mb-1`}>
                                <Icon name="map" size={12} color="#10B981" style={tw`mr-2`} />
                                <Text style={tw`text-xs text-green-600`}>
                                    Rota: {checkpoint.route_name}
                                </Text>
                            </View>
                        )}
                        {checkpoint.tempo_estimado && (
                            <View style={tw`flex-row items-center`}>
                                <Icon name="hourglass" size={12} color="#f50b0bff" style={tw`mr-2`} />
                                <Text style={tw`text-xs text-red-600`}>
                                    Tempo estimado: {formatTimeDuration(checkpoint.tempo_estimado)}
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </View>
        );
    };

    return (
        <ScrollView contentContainerStyle={tw`p-6 bg-gray-50 flex-grow`}>
            {visitorData ? (
                <View style={tw`bg-white rounded-xl shadow-md p-6`}>
                    {/* Título com indicador de atraso */}
                    <View style={tw`flex-row justify-between items-center mb-4`}>
                        <Text style={tw`text-3xl font-bold text-gray-800`}>Ficha do Visitante</Text>
                        {isVisitOverdue && (
                            <View style={tw`bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg`}>
                                <View style={tw`flex-row items-center`}>
                                    <Icon name="warning" size={20} color="#DC2626" style={tw`mr-2`} />
                                    <Text style={tw`text-red-800 font-semibold`}>
                                        Visita Atrasada
                                    </Text>
                                </View>
                                <Text style={tw`text-red-700 mt-1 text-sm`}>
                                    Esta visita está fora do tempo estimado. Verifique os checkpoints pendentes.
                                </Text>
                            </View>
                        )}
                    </View>
                    

                    
                    <View style={tw`mb-6`}>
                        <Text style={tw`text-sm font-medium text-gray-500`}>ID do Visitante</Text>
                        <Text style={tw`text-lg text-gray-800 mt-1`}>{visitorData.id}</Text>
                    </View>

                    <View style={tw`mb-6`}>
                        <Text style={tw`text-sm font-medium text-gray-500`}>Nome</Text>
                        <Text style={tw`text-xl font-semibold text-gray-800 mt-1`}>{visitorData.name}</Text>
                    </View>

                    {/* Dados Pessoais */}
                    <View style={tw`flex-row justify-between mb-6`}>
                        {visitorData.age && (
                            <View style={tw`w-1/2 pr-2`}>
                                <Text style={tw`text-sm font-medium text-gray-500`}>Idade</Text>
                                <Text style={tw`text-lg text-gray-800 mt-1`}>{visitorData.age}</Text>
                            </View>
                        )}
                        {visitorData.gender && (
                            <View style={tw`w-1/2 pl-2`}>
                                <Text style={tw`text-sm font-medium text-gray-500`}>Gênero</Text>
                                <Text style={tw`text-lg text-gray-800 mt-1`}>{visitorData.gender}</Text>
                            </View>
                        )}
                    </View>

                    {/* Documentos */}
                    <View style={tw`flex-row justify-between mb-6`}>
                        {visitorData.cpf && (
                            <View style={tw`w-1/2 pr-2`}>
                                <Text style={tw`text-sm font-medium text-gray-500`}>CPF</Text>
                                <Text style={tw`text-lg text-gray-800 mt-1`}>{visitorData.cpf}</Text>
                            </View>
                        )}
                        {visitorData.rg && (
                            <View style={tw`w-1/2 pl-2`}>
                                <Text style={tw`text-sm font-medium text-gray-500`}>RG</Text>
                                <Text style={tw`text-lg text-gray-800 mt-1`}>{visitorData.rg}</Text>
                            </View>
                        )}
                    </View>

                    {/* Contato */}
                    <View style={tw`flex-row justify-between mb-6`}>
                        {visitorData.telefone && (
                            <View style={tw`w-1/2 pr-2`}>
                                <Text style={tw`text-sm font-medium text-gray-500`}>Telefone</Text>
                                <Text style={tw`text-lg text-gray-800 mt-1`}>{visitorData.telefone}</Text>
                            </View>
                        )}
                    </View>

                    {/* Image with fallback */}
                    {visitorData.image_url ? (
                        <Image 
                            source={{ uri: visitorData.image_url }} 
                            style={tw`w-full h-48 rounded-lg mb-4`}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={tw`w-full h-48 bg-gray-200 rounded-lg mb-4 justify-center items-center`}>
                            <Icon name="person" size={48} color="#9CA3AF" />
                            <Text style={tw`text-gray-500 mt-2`}>Sem imagem</Text>
                        </View>
                    )}

                    {/* Informações de Controle */}
                    <View style={tw`mb-6 bg-gray-100 p-4 rounded-lg`}>
                        <Text style={tw`text-sm font-medium text-gray-500 mb-2`}>Informações de Controle</Text>
                        
                        {visitorData.registered_by && (
                            <View style={tw`flex-row justify-between mb-1`}>
                                <Text style={tw`text-gray-700`}>Registrado por:</Text>
                                <Text style={tw`text-gray-800 font-medium`}>{visitorData.registered_by}</Text>
                            </View>
                        )}
                        
                        {visitorData.created_at && (
                            <View style={tw`flex-row justify-between mb-1`}>
                                <Text style={tw`text-gray-700`}>Data de cadastro:</Text>
                                <Text style={tw`text-gray-800 font-medium`}>
                                    {formatDateTime(visitorData.created_at)}
                                </Text>
                            </View>
                        )}
                        
                        {visitorData.updated_at && (
                            <View style={tw`flex-row justify-between`}>
                                <Text style={tw`text-gray-700`}>Última atualização:</Text>
                                <Text style={tw`text-gray-800 font-medium`}>
                                    {formatDateTime(visitorData.updated_at)}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Observações */}
                    {visitorData.notes && (
                        <View style={tw`mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200`}>
                            <Text style={tw`text-sm font-medium text-blue-700 mb-2`}>Observações</Text>
                            <Text style={tw`text-blue-800`}>{visitorData.notes}</Text>
                        </View>
                    )}

                    {/* Informações da Visita Agendada */}
                    {(plannedCheckpoints.length > 0 || visitDuration) && (
                        <View style={tw`mb-6 bg-indigo-50 p-4 rounded-lg border border-indigo-200`}>
                            <Text style={tw`text-sm font-medium text-indigo-700 mb-3`}>
                                Informações da Visita Agendada
                            </Text>
                            
                            {visitDuration && (
                                <View style={tw`flex-row items-center mb-3`}>
                                    <Icon name="hourglass" size={16} color="#6366F1" style={tw`mr-2`} />
                                    <Text style={tw`text-indigo-800`}>
                                        Duração total estimada: {formatTimeDuration(visitDuration)}
                                    </Text>
                                </View>
                            )}
                            
                            {plannedCheckpoints.length > 0 && (
                                <View>
                                    <View style={tw`flex-row items-center mb-2`}>
                                        <Icon name="list" size={16} color="#6366F1" style={tw`mr-2`} />
                                        <Text style={tw`text-indigo-800 font-medium`}>
                                            Sequência de Pavilhões:
                                        </Text>
                                    </View>
                                    
                                    <View style={tw`bg-white rounded-lg p-3 border border-indigo-100`}>
                                        {plannedCheckpoints.map((checkpoint, index) => (
                                            <View key={checkpoint.id} style={tw`flex-row items-center py-1 ${index !== plannedCheckpoints.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                                <View style={tw`bg-indigo-100 w-6 h-6 rounded-full items-center justify-center mr-3`}>
                                                    <Text style={tw`text-indigo-700 font-bold text-xs`}>
                                                        {checkpoint.order_number || index + 1}
                                                    </Text>
                                                </View>
                                                <Text style={tw`text-gray-800 flex-1`}>
                                                    {checkpoint.pavilion_name || checkpoint.pavilion || 'Pavilhão não informado'}
                                                </Text>
                                                {checkpoint.tempo_estimado && (
                                                    <Text style={tw`text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full`}>
                                                        {formatTimeDuration(checkpoint.tempo_estimado)}
                                                    </Text>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                    
                                    {/* Resumo da sequência */}
                                    <View style={tw`flex-row justify-between mt-2`}>
                                        <Text style={tw`text-xs text-indigo-600`}>
                                            Início: {plannedCheckpoints[0]?.pavilion_name || plannedCheckpoints[0]?.pavilion}
                                        </Text>
                                        <Text style={tw`text-xs text-indigo-600`}>
                                            Fim: {plannedCheckpoints[plannedCheckpoints.length - 1]?.pavilion_name || plannedCheckpoints[plannedCheckpoints.length - 1]?.pavilion}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Seção de Checkpoints */}
                    <View style={tw`mb-6`}>
                        <Text style={tw`text-lg font-bold text-gray-800 mb-3`}>Checkpoints</Text>
                        
                        {/* Tabs */}
                        <View style={tw`flex-row mb-4 bg-gray-100 rounded-lg p-1`}>
                            <TouchableOpacity
                                onPress={() => setActiveTab('realizados')}
                                style={tw`flex-1 py-2 rounded-lg ${
                                    activeTab === 'realizados' ? 'bg-white shadow-sm' : ''
                                }`}
                            >
                                <Text style={tw`text-center font-medium ${
                                    activeTab === 'realizados' ? 'text-blue-600' : 'text-gray-600'
                                }`}>
                                    Realizados ({completedCheckpoints.length})
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setActiveTab('planejados')}
                                style={tw`flex-1 py-2 rounded-lg ${
                                    activeTab === 'planejados' ? 'bg-white shadow-sm' : ''
                                }`}
                            >
                                <Text style={tw`text-center font-medium ${
                                    activeTab === 'planejados' ? 'text-blue-600' : 'text-gray-600'
                                }`}>
                                    Planejados ({plannedCheckpoints.length})
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {loadingCheckpoints ? (
                            <ActivityIndicator size="small" color="#3B82F6" />
                        ) : (
                            <View style={tw`bg-white border border-gray-200 rounded-lg`}>
                                {activeTab === 'realizados' ? (
                                    completedCheckpoints.length > 0 ? (
                                        completedCheckpoints.map((checkpoint, index) => 
                                            renderCheckpointItem(checkpoint, index, true)
                                        )
                                    ) : (
                                        <View style={tw`p-6 items-center`}>
                                            <Icon name="walk" size={32} color="#9CA3AF" />
                                            <Text style={tw`text-gray-500 mt-2`}>
                                                Nenhum checkpoint realizado
                                            </Text>
                                        </View>
                                    )
                                ) : (
                                    plannedCheckpoints.length > 0 ? (
                                        plannedCheckpoints.map((checkpoint, index) => 
                                            renderCheckpointItem(checkpoint, index, false)
                                        )
                                    ) : (
                                        <View style={tw`p-6 items-center`}>
                                            <Icon name="calendar" size={32} color="#9CA3AF" />
                                            <Text style={tw`text-gray-500 mt-2`}>
                                                Nenhum checkpoint planejado
                                            </Text>
                                        </View>
                                    )
                                )}
                            </View>
                        )}
                    </View>

                    {/* Localização - Só mostra se tiver coordenadas */}
                    {(visitorData.latitude && visitorData.longitude) ? (
                        <TouchableOpacity
                            onPress={() => openMapModal(visitorData.latitude, visitorData.longitude)}
                            style={tw`bg-blue-600 rounded-lg p-4 shadow-lg flex-row justify-center items-center mb-4`}
                        >
                            <Icon name="map" size={20} color="white" style={tw`mr-2`} />
                            <Text style={tw`text-white text-lg font-semibold`}>
                                Ver Localização no Mapa
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={tw`bg-gray-100 rounded-lg p-4 mb-4 items-center`}>
                            <Icon name="location-off" size={24} color="#6B7280" />
                            <Text style={tw`text-gray-600 mt-2 text-center`}>
                                Localização não disponível
                            </Text>
                        </View>
                    )}

                    {/* Back Button */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('PageGeral')}
                        style={tw`bg-gray-200 rounded-lg p-4`}
                    >
                        <Text style={tw`text-gray-800 font-medium text-center`}>Voltar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={tw`flex-1 justify-center items-center`}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={tw`text-lg text-gray-500 mt-4`}>Carregando dados da ficha...</Text>
                </View>
            )}

            {/* Modal do Mapa */}
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