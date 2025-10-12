import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, Modal, ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';
import { supabase } from '../services/supabase';
import { useNavigation } from '@react-navigation/native';
import tw from 'tailwind-react-native-classnames';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';

const MarcarCheckpoints = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [visitorData, setVisitorData] = useState([]);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);
  const [pavilion, setPavilion] = useState('');
  const [pavilionId, setPavilionId] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [loadingCheckpoints, setLoadingCheckpoints] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [plannedPavilions, setPlannedPavilions] = useState([]); // Pavilhões que o visitante deve passar
  const [showPlannedPavilions, setShowPlannedPavilions] = useState(false);
  const year = new Date().getFullYear();

  // Inicializa NFC
  useEffect(() => {
    NfcManager.start();
    return () => NfcManager.cancelTechnologyRequest();
  }, []);

  // Busca visitantes e pavilhão do usuário
  useEffect(() => {
    fetchVisitorsData();
    fetchUserPavilion();
    fetchUser();
  }, []);

  // Buscar pavilhões planejados quando um visitante é selecionado
  useEffect(() => {
    if (selectedVisitor) {
      fetchVisitorCheckpoints(selectedVisitor.id);
      fetchPlannedPavilions(selectedVisitor.id);
    } else {
      setCheckpoints([]);
      setPlannedPavilions([]);
    }
  }, [selectedVisitor]);

  const fetchUser = async () => {
    const email = await AsyncStorage.getItem('currentUser');
    console.log('Email do usuário:', email);

    if (email) {
      const { data: userData, error: userError } = await supabase
        .from('usersSpulse')
        .select('id, name, email')
        .eq('email', email)
        .single();

      console.log('Dados do usuário:', userData);

      if (!userError && userData) {
        setCurrentUser(userData);
      } else {
        console.error('Erro ao buscar usuário:', userError);
      }
    }
  }

  // Buscar pavilhões planejados para o visitante
  const fetchPlannedPavilions = async (visitorId) => {  
    try {
      console.log('Buscando pavilhões planejados para visitante:', visitorId);
      
      // Buscar o agendamento do visitante (considerando status "confirmada" ou "Em Andamento")
      const { data: agendamentos, error: agendamentoError } = await supabase
        .from('visitor_agendamento')
        .select('id')
        .eq('visitor_id', visitorId)
        .in('status', ['em_andamento', 'confirmada']) // Buscar ambos os status
        .order('created_at', { ascending: false })
        .limit(1);

      if (agendamentoError) throw agendamentoError;

      console.log('Agendamentos encontrados:', agendamentos);

      if (!agendamentos || agendamentos.length === 0) {
        console.log('Nenhum agendamento encontrado para o visitante');
        setPlannedPavilions([]);
        setShowPlannedPavilions(false);
        return;
      }

      const agendamentoId = agendamentos[0].id;
      console.log('ID do agendamento encontrado:', agendamentoId);

      // Buscar os checkpoints planejados usando o ID do agendamento
      const { data: scheduledCheckpoints, error: checkpointsError } = await supabase
        .from('scheduled_checkpoints')
        .select('pavilion, order_number')
        .eq('visit_schedule_id', agendamentoId)
        .order('order_number', { ascending: true });

      if (checkpointsError) throw checkpointsError;

      console.log('Checkpoints planejados encontrados:', scheduledCheckpoints);

      if (!scheduledCheckpoints || scheduledCheckpoints.length === 0) {
        console.log('Nenhum checkpoint planejado encontrado');
        setPlannedPavilions([]);
        setShowPlannedPavilions(false);
        return;
      }

      // Extrair IDs dos pavilhões dos checkpoints
      const pavilionIds = scheduledCheckpoints
        .map(cp => cp.pavilion)
        .filter(id => id != null);

      console.log('IDs dos pavilhões encontrados:', pavilionIds);

      if (pavilionIds.length === 0) {
        console.log('Nenhum ID de pavilhão válido encontrado');
        setPlannedPavilions([]);
        setShowPlannedPavilions(false);
        return;
      }

      // Buscar os nomes dos pavilhões
      const { data: pavilionsData, error: pavilionsError } = await supabase
        .from('pavilions')
        .select('id, name')
        .in('id', pavilionIds);

      if (pavilionsError) throw pavilionsError;

      console.log('Dados dos pavilhões encontrados:', pavilionsData);

      // Criar um mapa para busca rápida dos nomes
      const pavilionsMap = {};
      pavilionsData?.forEach(pav => {
        pavilionsMap[pav.id] = pav.name;
      });

      // Processar os checkpoints planejados com os nomes dos pavilhões
      const pavilionsList = scheduledCheckpoints.map(cp => {
        const pavilionId = cp.pavilion ? parseInt(cp.pavilion, 10) : null;
        return {
          id: pavilionId,
          name: pavilionsMap[pavilionId] || `Pavilhão ${cp.pavilion}`,
          order_number: cp.order_number,
          original_id: cp.pavilion // Manter o ID original para debug
        };
      }).filter(p => p.id != null); // Filtrar apenas os válidos

      console.log('Pavilhões processados:', pavilionsList);
      setPlannedPavilions(pavilionsList);
      
      // Mostrar automaticamente os pavilhões planejados
      setShowPlannedPavilions(true);

    } catch (error) {
      console.error('Erro ao buscar pavilhões planejados:', error);
      setPlannedPavilions([]);
      setShowPlannedPavilions(false);
    }
  };

  // Atualizar também a função checkAndUpdateVisitStatus para considerar ambos os status
  const checkAndUpdateVisitStatus = async (visitorId) => {
    try {
      console.log('Verificando status da visita para:', visitorId);
      
      // Buscar agendamentos ativos do visitante (considerando ambos os status)
      const { data: activeVisits, error: visitsError } = await supabase
        .from('visitor_agendamento')
        .select('id, status, scheduled_date')
        .eq('visitor_id', visitorId)
        .in('status', ['em_andamento', 'confirmada']); // Buscar ambos os status

      if (visitsError) throw visitsError;

      if (!activeVisits || activeVisits.length === 0) {
        console.log('Nenhuma visita ativa encontrada');
        return;
      }

      // Para cada visita ativa
      for (const visit of activeVisits) {
        console.log('Processando visita:', visit.id);
        
        // Buscar checkpoints planejados para este agendamento
        const { data: plannedCheckpoints, error: plannedError } = await supabase
          .from('scheduled_checkpoints')
          .select('pavilion, order_number')
          .eq('visit_schedule_id', visit.id)
          .order('order_number', { ascending: true });

        if (plannedError) throw plannedError;

        // Buscar checkpoints realizados do visitante
        const { data: completedCheckpoints, error: checkpointsError } = await supabase
          .from('visitor_checkpoints')
          .select('pavilion, pavilion_id, timestamp, checkpoint_status')
          .eq('visitor_id', visitorId)
          .eq('checkpoint_status', 'check')  // ← FILTRAR APENAS CHECKPOINTS CONFIRMADOS
          .order('timestamp', { ascending: true });

        if (checkpointsError) throw checkpointsError;

        if (!completedCheckpoints || completedCheckpoints.length === 0) {
          console.log('Nenhum checkpoint realizado ainda');
          continue;
        }

        // Extrair pavilhões planejados e realizados
        const plannedPavilions = plannedCheckpoints?.map(cp => 
          cp.pavilion.toString()
        ) || [];
        
        // Usar pavilion_id se disponível, senão usar pavilion
        const visitedPavilions = completedCheckpoints.map(cp => 
          (cp.pavilion_id ? cp.pavilion_id.toString() : cp.pavilion.toString())
        );

        console.log('Pavilhões planejados:', plannedPavilions);
        console.log('Pavilhões visitados:', visitedPavilions);

        // Verificar se todos os pavilhões planejados foram visitados
        const allPlannedVisited = plannedPavilions.every(pavilion => 
          visitedPavilions.includes(pavilion)
        );

        if (allPlannedVisited) {
          console.log('Todos os pavilhões planejados foram visitados com status check');
          
          // Atualizar status para "concluída"
          const { error: updateError } = await supabase
            .from('visitor_agendamento')
            .update({ 
              status: 'concluída',
              updated_at: new Date().toISOString()
            })
            .eq('id', visit.id);

          if (updateError) throw updateError;

          console.log('Status atualizado para concluída para visita:', visit.id);
          
          // Mostrar alerta informativo
          Alert.alert(
            'Visita Concluída ✅',
            `Todos os pavilhões planejados foram visitados! A visita foi automaticamente marcada como concluída.`,
            [{ text: 'OK' }]
          );
        } else {
          console.log('Ainda faltam pavilhões a serem visitados');
          const missingPavilions = plannedPavilions.filter(p => !visitedPavilions.includes(p));
          console.log('Pavilhões faltantes:', missingPavilions);
          
          // Se é o primeiro checkpoint com 'check', atualizar status para "em_andamento"
          if (completedCheckpoints.length === 1 && visit.status === 'confirmada') {
            console.log('Primeiro checkpoint confirmado - atualizando status para em_andamento');
            
            const { error: updateError } = await supabase
              .from('visitor_agendamento')
              .update({ 
                status: 'em_andamento',
                updated_at: new Date().toISOString()
              })
              .eq('id', visit.id);

            if (updateError) throw updateError;
            
            console.log('Status atualizado para em_andamento');
          }
        }
      }

    } catch (error) {
      console.error('Erro ao verificar status da visita:', error);
    }
  };

  // Verificar se o pavilhão atual está na lista de pavilhões planejados
  const isCurrentPavilionAllowed = () => {
    if (!pavilionId || plannedPavilions.length === 0) {
      console.log('Pavilhão atual não verificado - sem dados suficientes');
      return true; // Permite se não há dados suficientes para verificar
    }

    const isAllowed = plannedPavilions.some(p => p.id.toString() === pavilionId.toString());
    console.log(`Pavilhão atual ${pavilionId} está permitido?`, isAllowed);
    console.log('Pavilhões permitidos:', plannedPavilions.map(p => `${p.id} - ${p.name}`));
    
    return isAllowed;
  };

  const fetchVisitorsData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('visitors').select('*');
      if (error) throw error;
      setVisitorData(data || []);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os visitantes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPavilion = async () => {
    try {
      const email = await AsyncStorage.getItem('currentUser');
      if (!email) return;

      const { data, error } = await supabase
        .from('agent_checkpoints')
        .select('pavilion_id, pavilions(name, latitude, longitude)')
        .eq('user_email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        throw error;
      }

      if (data?.pavilion_id && data.pavilions) {
        setPavilion(data.pavilions.name);
        setPavilionId(data.pavilion_id);
        
        if (!data.pavilions.latitude || !data.pavilions.longitude) {
          Alert.alert(
            'Pavilhão sem Localização',
            `O pavilhão ${data.pavilions.name} não possui coordenadas definidas. Contate o administrador.`,
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Configuração necessária',
          'Você precisa registrar seu pavilhão antes de marcar checkpoints',
          [{ text: 'OK', onPress: () => navigation.navigate('MarcarCheckpoints') }]
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Configuração necessária',
        'Você precisa registrar seu pavilhão antes de marcar checkpoints',
        [{ text: 'OK', onPress: () => navigation.navigate('MarcarCheckpoints') }]
      );
    }
  };


  const fetchVisitorCheckpoints = async (visitorId) => {
    try {
      setLoadingCheckpoints(true);
      const { data, error } = await supabase
        .from('visitor_checkpoints')
        .select('*, pavilions (name)')
        .eq('visitor_id', visitorId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setCheckpoints(data || []);
    } catch (error) {
      console.error('Erro ao buscar checkpoints:', error);
      Alert.alert('Erro', 'Não foi possível carregar os checkpoints do visitante');
    } finally {
      setLoadingCheckpoints(false);
    }
  };


  const handleSelectVisitor = (visitor) => {
    setSelectedVisitor(visitor);
    setShowPlannedPavilions(true); // Mostrar pavilhões quando selecionar manualmente
  };

  const readNfcTag = async () => {
    try {
      setNfcReading(true);
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      if (!tag?.ndefMessage?.length) throw new Error('Nenhuma mensagem NDEF encontrada');

      const record = tag.ndefMessage[0];
      let payloadContent = '';

      if (record.tnf === Ndef.TNF_WELL_KNOWN && record.type[0] === 0x55) {
        payloadContent = Ndef.uri.decodePayload(record.payload);
      } else if (record.tnf === Ndef.TNF_WELL_KNOWN && arrayEquals(record.type, Ndef.RTD_TEXT)) {
        payloadContent = Ndef.text.decodePayload(record.payload);
      } else {
        payloadContent = String.fromCharCode.apply(null, record.payload);
      }

      const visitorId = payloadContent.split('/').pop();
      if (!visitorId) throw new Error('ID do visitante inválido');

      const foundVisitor = visitorData.find(v => v.id.toString() === visitorId.toString());
      if (foundVisitor) {
        setSelectedVisitor(foundVisitor);
        
        // Buscar e mostrar os pavilhões planejados usando o método principal
        await fetchPlannedPavilions(foundVisitor.id);
        
        Alert.alert(
          'Visitante Identificado', 
          `${foundVisitor.name} (ID: ${foundVisitor.id})\n\nPavilhões planejados carregados.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Visitante não encontrado',
          `Nenhum visitante com ID ${visitorId} foi encontrado`,
          [
            { text: 'Atualizar Lista', onPress: async () => { await fetchVisitorsData(); readNfcTag(); } },
            { text: 'OK' }
          ]
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao ler a pulseira NFC');
    } finally {
      setNfcReading(false);
      NfcManager.cancelTechnologyRequest();
    }
  };

  function arrayEquals(a, b) {
    return a.length === b.length && a.every((val, idx) => val === b[idx]);
  }

  const registerCheckpoint = async (visitorId) => {
    if (!visitorId) {
      Alert.alert('Atenção', 'Selecione um visitante primeiro');
      return;
    }

    if (!pavilion) {
      Alert.alert('Erro', 'Pavilhão não configurado');
      return;
    }

    // VERIFICAR SE O PAVILHÃO ATUAL ESTÁ PERMITIDO
    if (!isCurrentPavilionAllowed()) {
      Alert.alert(
        'Pavilhão Não Permitido ⚠️',
        `O pavilhão ${pavilion} não está na rota planejada para este visitante.\n\nPavilhões permitidos:\n${plannedPavilions.map(p => `• ${p.name}`).join('\n')}`,
        [
          { 
            text: 'Ver Rota Completa', 
            onPress: () => setShowPlannedPavilions(true) 
          },
          { text: 'Entendi' }
        ]
      );
      return;
    }

    try {
      setLoading(true);


      // Se está dentro do raio e pavilhão permitido, registrar checkpoint
      const { error } = await supabase.from('visitor_checkpoints').insert([
        { 
          visitor_id: visitorId, 
          pavilion: pavilion, 
          timestamp: new Date().toISOString(),
          registered_by: currentUser.id,
          pavilion_id: pavilionId,
          checkpoint_status: 'check'
        }
      ]);
      
      if (error) throw error;

      Alert.alert('Sucesso', `Checkpoint registrado no pavilhão ${pavilion}!`);
      
      // Atualizar lista de checkpoints
      fetchVisitorCheckpoints(visitorId);

      // VERIFICAR E ATUALIZAR STATUS DA VISITA
      await checkAndUpdateVisitStatus(visitorId);
      
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`bg-white p-6 shadow-sm`}>
        <Text style={tw`text-2xl font-bold text-gray-800`}>Registro de Checkpoints</Text>
        <Text style={tw`text-gray-500 mt-1`}>Registre a passagem de visitantes pelo seu bloco</Text>
        {pavilion && (
          <View style={tw`mt-2 flex-row items-center`}>
            <Icon name="business" size={18} color="#4B5563" />
            <Text style={tw`text-gray-700 ml-2`}>Pavilhão: {pavilion}</Text>
            <Icon name="location" size={16} color="#10B981" style={tw`ml-4`} />
            <Text style={tw`text-green-600 text-xs ml-1`}>Verificação de localização ativa</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={tw`p-4`}>
        {/* NFC */}
        <View style={tw`mb-6 bg-white rounded-xl shadow-sm p-5`}>
          <Text style={tw`text-lg font-semibold text-gray-800 mb-3`}>Identificação por NFC</Text>
          <TouchableOpacity
            onPress={readNfcTag}
            disabled={nfcReading}
            style={tw`bg-blue-600 rounded-lg p-4 flex-row items-center justify-center ${nfcReading ? 'opacity-70' : ''}`}
          >
            <Icon name="scan" size={20} color="white" style={tw`mr-2`} />
            <Text style={tw`text-white font-medium text-lg`}>{nfcReading ? 'Lendo...' : 'Ler Pulseira NFC'}</Text>
          </TouchableOpacity>
        </View>

        {/* Seleção Manual */}
        <View style={tw`mb-6 bg-white rounded-xl shadow-sm p-5`}>
          <Text style={tw`text-lg font-semibold text-gray-800 mb-3`}>Visitante Selecionado</Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={tw`border-2 ${selectedVisitor ? 'border-solid border-blue-400' : 'border-dashed border-gray-300'} rounded-lg p-4 items-center`}
          >
            {selectedVisitor ? (
              <>
                <Icon name="person" size={24} color="#3B82F6" />
                <Text style={tw`text-gray-800 mt-2 font-medium`}>{selectedVisitor.name}</Text>
                <Text style={tw`text-gray-500 text-sm mt-1`}>ID: {selectedVisitor.id}</Text>
              </>
            ) : (
              <>
                <Icon name="person-add" size={24} color="#6B7280" />
                <Text style={tw`text-gray-700 mt-2`}>Selecionar Visitante</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Pavilhões Planejados */}
        {selectedVisitor && plannedPavilions.length > 0 && showPlannedPavilions && (
          <View style={tw`mb-6 bg-indigo-50 rounded-xl shadow-sm p-5 border border-indigo-200`}>
            <View style={tw`flex-row justify-between items-center mb-3`}>
              <Text style={tw`text-lg font-semibold text-indigo-800`}>Rota Planejada</Text>
              <TouchableOpacity onPress={() => setShowPlannedPavilions(false)}>
                <Icon name="close" size={20} color="#4F46E5" />
              </TouchableOpacity>
            </View>
            <Text style={tw`text-indigo-700 mb-3`}>
              Este visitante deve passar pelos seguintes pavilhões:
            </Text>
            <View style={tw`space-y-2`}>
              {plannedPavilions.sort((a, b) => (a.order_number || 0) - (b.order_number || 0)).map((pavilionItem, index) => (
                <View key={pavilionItem.id} style={tw`flex-row items-center bg-white rounded-lg p-3 border ${pavilionItem.id.toString() === pavilionId?.toString() ? 'border-green-500 bg-green-50' : 'border-indigo-200'}`}>
                  <View style={tw`bg-indigo-100 w-6 h-6 rounded-full items-center justify-center mr-3`}>
                    <Text style={tw`text-indigo-700 font-bold text-xs`}>
                      {pavilionItem.order_number || index + 1}
                    </Text>
                  </View>
                  <Text style={tw`text-gray-800 flex-1`}>{pavilionItem.name}</Text>
                  {pavilionItem.id.toString() === pavilionId?.toString() && (
                    <View style={tw`flex-row items-center`}>
                      <Icon name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={tw`text-green-600 text-xs ml-1`}>Seu pavilhão</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
            <View style={tw`mt-3 flex-row justify-between`}>
              <Text style={tw`text-xs text-indigo-600`}>
                Início: {plannedPavilions[0]?.name}
              </Text>
              <Text style={tw`text-xs text-indigo-600`}>
                Fim: {plannedPavilions[plannedPavilions.length - 1]?.name}
              </Text>
            </View>
          </View>
        )}

        {/* Checkpoints do Visitante */}
        {selectedVisitor && (
          <View style={tw`mb-6 bg-white rounded-xl shadow-sm p-5`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <Text style={tw`text-lg font-semibold text-gray-800`}>Histórico de Checkpoints</Text>
              <TouchableOpacity onPress={() => fetchVisitorCheckpoints(selectedVisitor.id)}>
                <Icon name="refresh" size={20} color="#3B82F6" />
              </TouchableOpacity>
            </View>

            {loadingCheckpoints ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : checkpoints.length === 0 ? (
              <Text style={tw`text-gray-500 text-center py-4`}>
                Nenhum checkpoint registrado para este visitante
              </Text>
            ) : (
              <View>
                {checkpoints.map((checkpoint, index) => (
                  <View key={checkpoint.id} style={tw`border-b border-gray-100 py-3 ${index === 0 ? 'border-t' : ''}`}>
                    <View style={tw`flex-row justify-between items-start mb-1`}>
                      <Text style={tw`font-medium text-gray-800`}>
                        {checkpoint.pavilion?.name || checkpoint.pavilion}
                      </Text>
                      <View style={tw`flex-row items-center`}>
                        {checkpoint.location_verified && (
                          <Icon name="checkmark-circle" size={14} color="#10B981" style={tw`mr-1`} />
                        )}
                        <Text style={tw`text-sm text-gray-500`}>
                          {formatDateTime(checkpoint.timestamp)}
                        </Text>
                      </View>
                    </View>
                    {checkpoint.registered_by && (
                      <Text style={tw`text-xs text-gray-400`}>
                        Registrado por: {checkpoint.registered_by}
                      </Text>
                    )}
                    {checkpoint.location_verified && (
                      <Text style={tw`text-xs text-green-500`}>
                        ✓ Localização verificada
                      </Text>
                    )}
                  </View>
                ))}
                <Text style={tw`text-sm text-gray-500 mt-3`}>
                  Total de checkpoints: {checkpoints.length}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Registrar Checkpoint */}
        <TouchableOpacity
          onPress={() => registerCheckpoint(selectedVisitor?.id)}
          disabled={!selectedVisitor || loading || checkingLocation}
          style={tw`bg-green-600 rounded-lg p-4 ${!selectedVisitor || loading || checkingLocation ? 'opacity-70' : ''}`}
        >
          {loading || checkingLocation ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={tw`text-white font-bold text-lg text-center`}>
              Registrar Checkpoint em {pavilion}
            </Text>
          )}
        </TouchableOpacity>

        {/* Informação sobre verificação de localização */}
        <View style={tw`mt-3 bg-blue-50 p-3 rounded-lg border border-blue-200`}>
          <View style={tw`flex-row items-center`}>
            <Icon name="information-circle" size={16} color="#3B82F6" />
            <Text style={tw`text-blue-700 text-xs ml-2`}>
              Verificação de localização ativa: você precisa estar a até 5 metros do pavilhão para registrar checkpoints.
            </Text>
          </View>
        </View>

        {/* Mostrar Rota Planejada */}
        {selectedVisitor && plannedPavilions.length > 0 && !showPlannedPavilions && (
          <TouchableOpacity
            onPress={() => setShowPlannedPavilions(true)}
            style={tw`mt-3 bg-indigo-100 rounded-lg p-3 border border-indigo-300`}
          >
            <View style={tw`flex-row items-center justify-center`}>
              <Icon name="map" size={16} color="#4F46E5" />
              <Text style={tw`text-indigo-700 font-medium text-center ml-2`}>
                Ver Rota Planejada do Visitante
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Limpar Seleção */}
        {selectedVisitor && (
          <TouchableOpacity
            onPress={() => {
              setSelectedVisitor(null);
              setPlannedPavilions([]);
              setShowPlannedPavilions(false);
            }}
            style={tw`mt-3 bg-gray-300 rounded-lg p-3`}
          >
            <Text style={tw`text-gray-700 font-medium text-center`}>Limpar Seleção</Text>
          </TouchableOpacity>
        )}

        {/* Voltar */}
        <TouchableOpacity
          onPress={() => navigation.navigate('PageGeral')}
          style={tw`mt-4 bg-gray-200 rounded-lg p-4`}
        >
          <Text style={tw`text-gray-800 font-medium text-center`}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de Seleção de Visitante */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={tw`flex-1 justify-center bg-black bg-opacity-50 p-4`}>
          <View style={tw`bg-white rounded-xl p-6 max-h-96`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <Text style={tw`text-xl font-bold text-gray-800`}>Selecione um Visitante</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {visitorData.map(visitor => (
                <TouchableOpacity
                  key={visitor.id}
                  onPress={() => { handleSelectVisitor(visitor); setModalVisible(false); }}
                  style={tw`p-4 border-b border-gray-100 flex-row items-center`}
                >
                  <View style={tw`bg-blue-100 p-2 rounded-full mr-3`}>
                    <Icon name="person" size={18} color="#3B82F6" />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-gray-800 font-medium`}>{visitor.name}</Text>
                    <Text style={tw`text-gray-500 text-xs`}>ID: {visitor.id}</Text>
                  </View>
                  <Icon name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* NFC Modal */}
      <Modal visible={nfcReading} transparent animationType="fade">
        <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
          <View style={tw`bg-white rounded-xl p-6 w-5/6 items-center`}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={tw`text-lg text-gray-800 mt-4 text-center`}>Aproxime a pulseira NFC do dispositivo...</Text>
            <TouchableOpacity
              onPress={() => { setNfcReading(false); NfcManager.cancelTechnologyRequest(); }}
              style={tw`mt-4 bg-red-100 px-4 py-2 rounded-lg`}
            >
              <Text style={tw`text-red-600 font-medium`}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Versão */}
      <View style={tw`mt-6 items-center pb-4`}>
        <Text style={tw`text-gray-400 text-sm`}>Versão 1.0.0</Text>
        <Text style={tw`text-gray-400 text-xs`}>© {year} Sistema Spulse</Text>
      </View>
    </View>
  );
};

export default MarcarCheckpoints;