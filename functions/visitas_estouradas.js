// visitas_estouradas.js
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';

// Estado global para o modal
let setOverdueVisitsModal = null;
let setOverdueVisitsData = null;

// Função para configurar os setters do modal
export const setupOverdueVisitsModal = (setModalVisible, setVisitsData) => {
    setOverdueVisitsModal = setModalVisible;
    setOverdueVisitsData = setVisitsData;
};

// Função para verificar visitas com tempo estourado e mostrar Modal
export const checkAndShowOverdueVisits = async () => {
    try {
        console.log('🔍 Verificando visitas estouradas...');
        
        // Buscar todas as visitas com status 'em_andamento' - CORREÇÃO DA QUERY
        const { data: ongoingVisits, error: visitsError } = await supabase
            .from('visitor_agendamento')
            .select(`
                *,
                visitors (name, id),
                scheduled_checkpoints (pavilion, order_number)
            `)
            .in('status', ['em_andamento', 'confirmada']);

        if (visitsError) {
            console.error('Erro ao buscar visitas:', visitsError);
            throw visitsError;
        }

        console.log(`📊 ${ongoingVisits?.length || 0} visitas em andamento encontradas`);

        const now = new Date();
        const overdueVisits = [];

        // Verificar cada visita em andamento
        for (const visit of ongoingVisits || []) {
            console.log(`🔍 Processando visita: ${visit.visitors?.name}`);
            
            if (visit.scheduled_date && visit.expected_duration) {
                // Combinar data agendada com horário agendado
                let scheduledDateTime = new Date(visit.scheduled_date);
                
                // Se tiver scheduled_time, usar como base
                if (visit.scheduled_time) {
                    scheduledDateTime = new Date(visit.scheduled_time);
                }

                console.log('📅 Data/hora agendada:', scheduledDateTime);

                // Calcular o tempo final estimado
                let hours = 0;
                let minutes = 0;

                if (visit.expected_duration) {
                    // Suportar diferentes formatos: "02:30:00" ou "2h30min"
                    if (visit.expected_duration.includes(':')) {
                        const timeParts = visit.expected_duration.split(':');
                        hours = parseInt(timeParts[0]) || 0;
                        minutes = parseInt(timeParts[1]) || 0;
                    } else if (visit.expected_duration.includes('h')) {
                        const durationParts = visit.expected_duration.split('h');
                        hours = parseInt(durationParts[0]) || 0;
                        minutes = parseInt(durationParts[1]?.replace('min', '')) || 0;
                    }
                }

                console.log(`⏰ Duração: ${hours}h ${minutes}min`);

                const estimatedEndTime = new Date(scheduledDateTime);
                estimatedEndTime.setHours(estimatedEndTime.getHours() + hours);
                estimatedEndTime.setMinutes(estimatedEndTime.getMinutes() + minutes);

                console.log('⏰ Tempo final estimado:', estimatedEndTime);
                console.log('🕐 Agora:', now);

                // Verificar se o tempo estourou
                if (now > estimatedEndTime) {
                    const overdueMinutes = Math.floor((now - estimatedEndTime) / (1000 * 60));
                    const overdueHours = Math.floor(overdueMinutes / 60);
                    const remainingMinutes = overdueMinutes % 60;
                    
                    console.log(`🚨 Visita atrasada: ${overdueMinutes} minutos`);
                    
                    // Buscar informações dos pavilhões planejados
                    let pavilionsInfo = [];
                    if (visit.scheduled_checkpoints && visit.scheduled_checkpoints.length > 0) {
                        // Extrair IDs dos pavilhões
                        const pavilionIds = visit.scheduled_checkpoints
                            .map(cp => cp.pavilion)
                            .filter(id => id != null);
                        
                        if (pavilionIds.length > 0) {
                            // Buscar nomes dos pavilhões
                            const { data: pavilionsData } = await supabase
                                .from('pavilions')
                                .select('id, name')
                                .in('id', pavilionIds);
                            
                            // Criar mapa de pavilhões
                            const pavilionsMap = {};
                            pavilionsData?.forEach(pav => {
                                pavilionsMap[pav.id] = pav.name;
                            });
                            
                            // Processar checkpoints com nomes
                            pavilionsInfo = visit.scheduled_checkpoints.map(cp => ({
                                pavilion: cp.pavilion,
                                name: pavilionsMap[cp.pavilion] || `Pavilhão ${cp.pavilion}`,
                                order_number: cp.order_number
                            }));
                        }
                    }
                    
                    overdueVisits.push({
                        id: visit.id,
                        visitorId: visit.visitor_id,
                        visitorName: visit.visitors?.name || 'Visitante',
                        scheduledTime: scheduledDateTime.toLocaleString('pt-BR'),
                        estimatedEndTime: estimatedEndTime.toLocaleString('pt-BR'),
                        overdueMinutes,
                        overdueHours,
                        remainingMinutes,
                        status: visit.status,
                        motivo: visit.motivo_da_visita || 'Não informado',
                        expectedDuration: visit.expected_duration,
                        pavilions: pavilionsInfo,
                        currentPavilion: 'A definir' // Não temos essa informação direta
                    });
                } else {
                    console.log('✅ Visita dentro do prazo');
                }
            } else {
                console.log('⚠️ Visita sem data ou duração definida');
            }
        }

        // Ordenar por tempo de atraso (mais atrasadas primeiro)
        overdueVisits.sort((a, b) => b.overdueMinutes - a.overdueMinutes);

        // Se houver visitas estouradas, mostrar Modal
        if (overdueVisits.length > 0) {
            console.log(`🚨 ${overdueVisits.length} visitas estouradas encontradas`);
            
            if (setOverdueVisitsModal && setOverdueVisitsData) {
                setOverdueVisitsData(overdueVisits);
                setOverdueVisitsModal(true);
            } else {
                // Fallback para Alert se o modal não estiver configurado
                showFallbackAlert(overdueVisits);
            }
        } else {
            console.log('✅ Nenhuma visita estourada encontrada');
            Alert.alert(
                'Verificação Concluída',
                'Nenhuma visita está com tempo estourado no momento.',
                [{ text: 'OK' }]
            );
        }

        return overdueVisits;

    } catch (error) {
        console.error('❌ Erro ao verificar visitas estouradas:', error);
        Alert.alert(
            'Erro', 
            'Não foi possível verificar as visitas em andamento.',
            [{ text: 'OK' }]
        );
        return [];
    }
};

// Fallback para Alert caso o modal não esteja disponível
const showFallbackAlert = (overdueVisits) => {
    let alertMessage = '';
    
    if (overdueVisits.length === 1) {
        const visit = overdueVisits[0];
        alertMessage = `🚨 ${visit.visitorName} está ${formatOverdueTime(visit.overdueMinutes)} atrasado.\nMotivo: ${visit.motivo}`;
    } else {
        alertMessage = `🚨 ${overdueVisits.length} visitas atrasadas:\n\n`;
        overdueVisits.forEach((visit, index) => {
            alertMessage += `${index + 1}. ${visit.visitorName} - ${formatOverdueTime(visit.overdueMinutes)}\n`;
        });
    }

    Alert.alert(
        'Visitas Atrasadas ⚠️',
        alertMessage,
        [
            { text: 'OK' }
        ]
    );
};

// Função para formatar o tempo de atraso
const formatOverdueTime = (minutes) => {
    if (minutes < 60) {
        return `${minutes} min`;
    } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}min`;
    }
};

// Função para iniciar a verificação periódica
export const startOverdueCheckInterval = () => {
    console.log('🔄 Iniciando verificação periódica de visitas estouradas');
    
    // Verificar imediatamente ao iniciar
    checkAndShowOverdueVisits();
    
    // Configurar verificação periódica (a cada 10 minutos)
    const interval = setInterval(() => {
        console.log('🔄 Verificação periódica de visitas estouradas');
        checkAndShowOverdueVisits();
    }, 10 * 60 * 1000);

    return interval;
};

// Função para testar com dados específicos
export const testOverdueVisits = async () => {
    console.log('🧪 Testando verificação de visitas estouradas...');
    await checkAndShowOverdueVisits();
};

export default {
    checkAndShowOverdueVisits,
    startOverdueCheckInterval,
    testOverdueVisits,
    setupOverdueVisitsModal
};