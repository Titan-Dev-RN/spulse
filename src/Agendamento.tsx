import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { supabase } from '../services/supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import tw from 'tailwind-react-native-classnames';
import DatePicker from 'react-native-date-picker';
import { format } from 'date-fns'; 
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';


export default function Agendamento() {
  const [visitors, setVisitors] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  

  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [visitDate, setVisitDate] = useState('');
  const [notes, setNotes] = useState('');


  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');

  const [visitReason, setVisitReason] = useState('');
  const [nfcReading, setNfcReading] = useState(false);
  const navigation = useNavigation();


  const [visitorSearch, setVisitorSearch] = useState('');
  const [visitorPage, setVisitorPage] = useState(1);
  const VISITORS_PER_PAGE = 5;

  // Filtrar visitantes pelo nome
  const filteredVisitors = visitors.filter(v =>
    v.name.toLowerCase().includes(visitorSearch.toLowerCase())
  );

  // Calcular visitantes da página atual
  const paginatedVisitors = filteredVisitors.slice(
    (visitorPage - 1) * VISITORS_PER_PAGE,
    visitorPage * VISITORS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredVisitors.length / VISITORS_PER_PAGE);

  const handlePrevPage = () => {
    if (visitorPage > 1) setVisitorPage(visitorPage - 1);
  };

  const handleNextPage = () => {
    if (visitorPage < totalPages) setVisitorPage(visitorPage + 1);
  };

  // Sempre que pesquisar, volta para página 1
  useEffect(() => {
    setVisitorPage(1);
  }, [visitorSearch]);

  const [routeSearch, setRouteSearch] = useState('');
  const [routePage, setRoutePage] = useState(1);
  const ROUTES_PER_PAGE = 5;

  // Filtrar rotas pelo nome
  const filteredRoutes = routes.filter(r =>
    r.name_route.toLowerCase().includes(routeSearch.toLowerCase())
  );

  // Calcular rotas da página atual
  const paginatedRoutes = filteredRoutes.slice(
    (routePage - 1) * ROUTES_PER_PAGE,
    routePage * ROUTES_PER_PAGE
  );

  const totalRoutePages = Math.ceil(filteredRoutes.length / ROUTES_PER_PAGE);

  const handlePrevRoutePage = () => {
    if (routePage > 1) setRoutePage(routePage - 1);
  };

  const handleNextRoutePage = () => {
    if (routePage < totalRoutePages) setRoutePage(routePage + 1);
  };

  // Sempre que pesquisar, volta para página 1
  useEffect(() => {
    setRoutePage(1);
  }, [routeSearch]);

  // Opções pré-definidas para motivo da visita
  const visitReasons = [
    'Visita',
    'Familiar',
    'Cliente',
    'Fornecedor',
    'Advogado',
    'Reunião',
    'Manutenção',
    'Instalação',
    'Vistoria',
    'Outro'
  ];

  // Inicializar NFC
  useEffect(() => {
    NfcManager.start();
    return () => {
      NfcManager.cancelTechnologyRequest();
    };
  }, []);

  const handleHoursChange = (text) => {
    // Permite apenas números e limita a 2 dígitos
    const numericText = text.replace(/[^0-9]/g, '');
    // Aceita valor vazio OU número entre 0-23
    if (numericText === '' || (parseInt(numericText) >= 0 && parseInt(numericText) <= 23)) {
      setHours(numericText);
    }
  };

  const handleMinutesChange = (text) => {
    // Permite apenas números e limita a 2 dígitos
    const numericText = text.replace(/[^0-9]/g, '');
    // Aceita valor vazio OU número entre 0-59
    if (numericText === '' || (parseInt(numericText) >= 0 && parseInt(numericText) <= 59)) {
      setMinutes(numericText);
    }
  };



  const getEstimatedTime = () => {
    // Se tiver apenas minutos (e horas vazia)
    if (!hours && minutes) {
      return `00:${minutes.padStart(2, '0')}:00`;
    }
    // Se tiver apenas horas (e minutos vazia)
    if (hours && !minutes) {
      return `${hours.padStart(2, '0')}:00:00`;
    }
    // Se tiver ambos
    if (hours && minutes) {
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
    }
    return null;
  };

  // Buscar visitantes e rotas no carregamento
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Obter email do usuário do AsyncStorage
        const email = await AsyncStorage.getItem('currentUser');
        console.log('Email do usuário:', email);

        if (email) {
          // Buscar informações completas do usuário na tabela usersSpulse usando o email
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

        // Buscar visitantes e rotas
        const [visitorsResult, routesResult] = await Promise.all([
          supabase.from('visitors').select('id, name, user_id'),
          supabase.from('visit_routes').select('id, name_route'),
        ]);

        setVisitors(visitorsResult.data || []);
        setRoutes(routesResult.data || []);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

   // Função para ler NFC
  const readNfcTag = async () => {
    try {
      setNfcReading(true);
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      
      if (!tag?.ndefMessage?.length) {
        throw new Error('Nenhuma mensagem NDEF encontrada na pulseira');
      }

      const record = tag.ndefMessage[0];
      let payloadContent = '';

      if (record.tnf === Ndef.TNF_WELL_KNOWN && record.type[0] === 0x55) {
        // URI
        payloadContent = Ndef.uri.decodePayload(record.payload);
      } else if (record.tnf === Ndef.TNF_WELL_KNOWN && arrayEquals(record.type, Ndef.RTD_TEXT)) {
        // Texto
        payloadContent = Ndef.text.decodePayload(record.payload);
      } else {
        // Outros tipos
        payloadContent = String.fromCharCode.apply(null, record.payload);
      }

      console.log('Conteúdo lido do NFC:', payloadContent);

      // Extrair ID do visitante do payload
      const visitorId = extractVisitorId(payloadContent);
      if (!visitorId) {
        throw new Error('ID do visitante não encontrado na pulseira');
      }

      console.log('ID do visitante extraído:', visitorId);

      // Buscar visitante no estado local
      const foundVisitor = visitors.find(v => v.id.toString() === visitorId.toString());
      
      if (foundVisitor) {
        setSelectedVisitor(foundVisitor.id);
        Alert.alert(
          'Visitante Identificado', 
          `${foundVisitor.name} (ID: ${foundVisitor.id})`,
          [{ text: 'OK' }]
        );
      } else {
        // Se não encontrou localmente, buscar no banco
        await searchVisitorInDatabase(visitorId);
      }

    } catch (error) {
      console.error('Erro na leitura NFC:', error);
      
      if (error.message.includes('NfcManager')) {
        Alert.alert(
          'Erro NFC', 
          'Não foi possível ler a pulseira. Verifique se o NFC está ativado.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Visitante Não Encontrado', 
          error.message,
          [
            { 
              text: 'Atualizar Lista', 
              onPress: async () => {
                await fetchVisitors();
                readNfcTag();
              } 
            },
            { text: 'OK' }
          ]
        );
      }
    } finally {
      setNfcReading(false);
      NfcManager.cancelTechnologyRequest();
    }
  };

  // Função auxiliar para extrair ID do visitante
  const extractVisitorId = (payload) => {
    try {
      // Tentar diferentes formatos de payload
      
      // Formato URL: https://exemplo.com/visitors/123
      if (payload.includes('/visitors/')) {
        return payload.split('/visitors/')[1];
      }
      
      // Formato URL: https://exemplo.com/123
      if (payload.includes('/')) {
        const parts = payload.split('/');
        return parts[parts.length - 1];
      }
      
      // Se for apenas o ID
      if (!isNaN(payload)) {
        return payload;
      }
      
      // Tentar parsear como JSON
      try {
        const jsonData = JSON.parse(payload);
        return jsonData.visitorId || jsonData.id || null;
      } catch {
        return null;
      }
    } catch (error) {
      console.error('Erro ao extrair ID:', error);
      return null;
    }
  };

  // Função auxiliar para comparar arrays
  function arrayEquals(a, b) {
    return a.length === b.length && a.every((val, idx) => val === b[idx]);
  }

  // Buscar visitante no banco de dados
  const searchVisitorInDatabase = async (visitorId) => {
    try {
      const { data: visitorData, error } = await supabase
        .from('visitors')
        .select('id, name')
        .eq('id', visitorId)
        .single();

      if (error) throw new Error('Visitante não encontrado no sistema');
      
      if (visitorData) {
        setSelectedVisitor(visitorData.id);
        // Atualizar lista local
        setVisitors(prev => [...prev, visitorData]);
        Alert.alert(
          'Visitante Encontrado', 
          `${visitorData.name} (ID: ${visitorData.id})`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      throw new Error(`Visitante com ID ${visitorId} não encontrado`);
    }
  };

  // Buscar visitantes
  const fetchVisitors = async () => {
    try {
      const { data, error } = await supabase
        .from('visitors')
        .select('id, name, user_id');
      
      if (error) throw error;
      setVisitors(data || []);
    } catch (error) {
      console.error('Erro ao carregar visitantes:', error);
    }
  };

  const handleScheduleVisit = async () => {
    if (!selectedVisitor || !selectedRoute || !visitDate || !visitReason) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios antes de agendar.');
      return;
    }

    if (!currentUser) {
      Alert.alert('Erro', 'Usuário não identificado. Faça login novamente.');
      return;
    }

    try {
      // Encontrar o visitor selecionado para obter o user_id correto
      const selectedVisitorData = visitors.find(v => v.id === selectedVisitor);
      if (!selectedVisitorData) {
        throw new Error('Visitante não encontrado');
      }

      // 1) Criar agendamento
      const { data: agendamento, error: agendamentoError } = await supabase
        .from('visitor_agendamento')
        .insert([{
          visitor_id: selectedVisitorData.id, // Usar user_id em vez do id do visitor
          route_id: selectedRoute,
          scheduled_date: visitDate.split('T')[0], // Apenas a data (YYYY-MM-DD)
          scheduled_time: visitDate, // Data e hora completa
          expected_duration: getEstimatedTime(),
          notes: notes || null,
          status: 'confirmada', // Status padrão
          created_by: currentUser.id, // Usuário que está agendando
          motivo_da_visita: visitReason // Motivo da visita
        }])
        .select()
        .single();


      if (agendamentoError) throw agendamentoError;

      // 2) Buscar checkpoints da rota
      const { data: checkpoints, error: checkpointsError } = await supabase
        .from('route_checkpoints')
        .select('*')
        .eq('route_id', selectedRoute)
        .order('order_number', { ascending: true });

      if (checkpointsError) throw checkpointsError;

      // 3) Criar scheduled_checkpoints para o agendamento (seguindo a estrutura correta da tabela)
      const scheduledCheckpoints = checkpoints.map(cp => ({
        visit_schedule_id: agendamento.id,
        pavilion: cp.pavilion_id,
        order_number: cp.order_number,
        tempo_estimado: getEstimatedTime() || null,
        notes: notes || null
      }));

      const { error: scheduleError } = await supabase
        .from('scheduled_checkpoints')
        .insert(scheduledCheckpoints);

      if (scheduleError) throw scheduleError;

      Alert.alert('Sucesso', 'Visita agendada com sucesso!');
      
      // Limpar formulário
      setSelectedVisitor(null);
      setSelectedRoute(null);
      setVisitDate('');
      setHours('');
      setMinutes('');
      setNotes('');
      setVisitReason('');

    } catch (error) {
      console.error('Erro ao agendar visita:', error);
      Alert.alert('Erro', 'Não foi possível agendar a visita.');
    }
  };

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
        <Icon name="refresh-circle" size={40} color="#3B82F6" />
        <Text style={tw`mt-4 text-gray-600`}>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={tw`flex-1 bg-gray-50`}>
      <View style={tw`p-6`}>
        {/* Header */}
        <View style={tw`bg-white rounded-xl p-6 shadow-sm mb-6`}>
          <View style={tw`flex-row items-center mb-4`}>
            <Icon name="calendar" size={28} color="#3B82F6" style={tw`mr-3`} />
            <Text style={tw`text-2xl font-bold text-gray-800`}>Agendar Visita</Text>
          </View>
          <Text style={tw`text-gray-600`}>
            Selecione o visitante, a rota e defina a data para agendar uma nova visita.
          </Text>
        </View>

        {/* Seção Visitante */}
        <View style={tw`bg-white rounded-xl p-6 shadow-sm mb-6`}>
          <Text style={tw`text-lg font-semibold text-gray-800 mb-4 flex-row items-center`}>
            <Icon name="person" size={20} color="#3B82F6" style={tw`mr-2`} />
            Selecione o Visitante *
          </Text>
          
          {/* Botão NFC */}
          <TouchableOpacity
            onPress={readNfcTag}
            disabled={nfcReading}
            style={tw`bg-purple-600 rounded-lg p-4 flex-row items-center justify-center mb-4 ${nfcReading ? 'opacity-70' : ''}`}
          >
            <Icon name="scan" size={20} color="white" style={tw`mr-2`} />
            <Text style={tw`text-white font-medium text-lg`}>
              {nfcReading ? 'Lendo Pulseira...' : 'Ler Pulseira NFC'}
            </Text>
          </TouchableOpacity>

          {/* Visitante Selecionado via NFC */}
          {selectedVisitor && (
            <View style={tw`bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4`}>
              <View style={tw`flex-row items-center`}>
                <Icon name="checkmark-circle" size={24} color="#10B981" style={tw`mr-3`} />
                <View>
                  <Text style={tw`text-green-800 font-semibold`}>
                    Visitante Selecionado:
                  </Text>
                  <Text style={tw`text-green-700`}>
                    {visitors.find(v => v.id === selectedVisitor)?.name} 
                    (ID: {selectedVisitor})
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedVisitor(null)}
                style={tw`mt-2 bg-red-100 rounded-lg px-3 py-1 self-start`}
              >
                <Text style={tw`text-red-600 text-sm`}>Limpar Seleção</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={tw`text-gray-600 mb-3 text-center`}>- OU -</Text>
          <Text style={tw`text-gray-600 mb-3 text-center`}>Selecione manualmente:</Text>
          
          <View style={tw`mb-4`}>
            <TextInput
              style={tw`border-2 border-gray-200 rounded-xl p-3 bg-gray-50 text-gray-800`}
              placeholder="Pesquisar visitante pelo nome..."
              placeholderTextColor="#9CA3AF"
              value={visitorSearch}
              onChangeText={setVisitorSearch}
            />
          </View>

          <FlatList
            data={paginatedVisitors}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={tw`p-4 mr-3 rounded-xl border-2 ${
                  selectedVisitor === item.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 bg-gray-50'
                } items-center`}
                onPress={() => setSelectedVisitor(item.id)}
              >
                <Icon 
                  name="person-circle" 
                  size={32} 
                  color={selectedVisitor === item.id ? "#3B82F6" : "#6B7280"} 
                  style={tw`mb-2`}
                />
                <Text 
                  style={tw`text-center font-medium ${
                    selectedVisitor === item.id ? 'text-blue-700' : 'text-gray-700'
                  }`}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={item => item.id.toString()}
            ListEmptyComponent={
              <View style={tw`p-4 items-center`}>
                <Icon name="alert-circle" size={32} color="#6B7280" />
                <Text style={tw`text-gray-600 mt-2`}>Nenhum visitante encontrado</Text>
              </View>
            }
          />

          {/* Paginação */}
          {totalPages > 1 && (
            <View style={tw`flex-row justify-center items-center mt-2`}>
              <TouchableOpacity
                onPress={handlePrevPage}
                disabled={visitorPage === 1}
                style={tw`px-3 py-2 mx-1 rounded bg-gray-200 ${visitorPage === 1 ? 'opacity-50' : ''}`}
              >
                <Text style={tw`text-gray-700`}>Anterior</Text>
              </TouchableOpacity>
              <Text style={tw`mx-2 text-gray-700`}>
                Página {visitorPage} de {totalPages}
              </Text>
              <TouchableOpacity
                onPress={handleNextPage}
                disabled={visitorPage === totalPages}
                style={tw`px-3 py-2 mx-1 rounded bg-gray-200 ${visitorPage === totalPages ? 'opacity-50' : ''}`}
              >
                <Text style={tw`text-gray-700`}>Próxima</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>

        {/* Seção Rota */}
        <View style={tw`bg-white rounded-xl p-6 shadow-sm mb-6`}>
          <Text style={tw`text-lg font-semibold text-gray-800 mb-4 flex-row items-center`}>
            <Icon name="map" size={20} color="#10B981" style={tw`mr-2`} />
            Selecione a Rota *
          </Text>
          
          <View style={tw`mb-4`}>
            <TextInput
              style={tw`border-2 border-gray-200 rounded-xl p-3 bg-gray-50 text-gray-800`}
              placeholder="Pesquisar rota pelo nome..."
              placeholderTextColor="#9CA3AF"
              value={routeSearch}
              onChangeText={setRouteSearch}
            />
          </View>

          <FlatList
            data={paginatedRoutes}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={tw`p-4 mr-3 rounded-xl border-2 ${
                  selectedRoute === item.id 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 bg-gray-50'
                }  items-center`}
                onPress={() => setSelectedRoute(item.id)}
              >
                <Icon 
                  name="location" 
                  size={32} 
                  color={selectedRoute === item.id ? "#10B981" : "#6B7280"} 
                  style={tw`mb-2`}
                />
                <Text 
                  style={tw`text-center font-medium ${
                    selectedRoute === item.id ? 'text-green-700' : 'text-gray-700'
                  }`}
                  numberOfLines={2}
                >
                  {item.name_route}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={item => item.id.toString()}
            ListEmptyComponent={
              <View style={tw`p-4 items-center`}>
                <Icon name="alert-circle" size={32} color="#6B7280" />
                <Text style={tw`text-gray-600 mt-2`}>Nenhuma rota encontrada</Text>
              </View>
            }
          />

          {/* Paginação das rotas */}
          {totalRoutePages > 1 && (
            <View style={tw`flex-row justify-center items-center mt-2`}>
              <TouchableOpacity
                onPress={handlePrevRoutePage}
                disabled={routePage === 1}
                style={tw`px-3 py-2 mx-1 rounded bg-gray-200 ${routePage === 1 ? 'opacity-50' : ''}`}
              >
                <Text style={tw`text-gray-700`}>Anterior</Text>
              </TouchableOpacity>
              <Text style={tw`mx-2 text-gray-700`}>
                Página {routePage} de {totalRoutePages}
              </Text>
              <TouchableOpacity
                onPress={handleNextRoutePage}
                disabled={routePage === totalRoutePages}
                style={tw`px-3 py-2 mx-1 rounded bg-gray-200 ${routePage === totalRoutePages ? 'opacity-50' : ''}`}
              >
                <Text style={tw`text-gray-700`}>Próxima</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>

        {/* Seção Agendador (usuário logado) */}
        <View style={tw`bg-white rounded-xl p-6 shadow-sm mb-6`}>
          <Text style={tw`text-lg font-semibold text-gray-800 mb-4 flex-row items-center`}>
            <Icon name="person-add" size={20} color="#6366F1" style={tw`mr-2`} />
            Agendamento sendo feito por:
          </Text>
          
          {currentUser ? (
            <View style={tw`flex-row items-center p-4 bg-indigo-50 rounded-xl border-2 border-indigo-500`}>
              <Icon name="person" size={32} color="#6366F1" style={tw`mr-3`} />
              <View>
                <Text style={tw`text-indigo-700 font-medium`}>{currentUser.name}</Text>
                <Text style={tw`text-indigo-600 text-sm`}>Usuário logado</Text>
              </View>
            </View>
          ) : (
            <View style={tw`p-4 items-center bg-gray-50 rounded-xl border-2 border-gray-300`}>
              <Icon name="alert-circle" size={32} color="#6B7280" />
              <Text style={tw`text-gray-600 mt-2`}>Usuário não identificado</Text>
            </View>
          )}
        </View>

        {/* Seção Motivo da Visita */}
        <View style={tw`bg-white rounded-xl p-6 shadow-sm mb-6`}>
          <Text style={tw`text-lg font-semibold text-gray-800 mb-4 flex-row items-center`}>
            <Icon name="help-circle" size={20} color="#F59E0B" style={tw`mr-2`} />
            Motivo da Visita *
          </Text>
          
          <View style={tw`border-2 border-gray-200 rounded-xl bg-gray-50`}>
            <Picker
              selectedValue={visitReason}
              onValueChange={(itemValue) => setVisitReason(itemValue)}
              style={tw`text-gray-800`}
            >
              <Picker.Item label="Selecione o motivo da visita" value="" />
              {visitReasons.map((reason, index) => (
                <Picker.Item key={index} label={reason} value={reason} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Seção Data e Hora */}
        <View style={tw`bg-white rounded-xl p-6 shadow-sm mb-6`}>
          <Text style={tw`text-lg font-semibold text-gray-800 mb-4 flex-row items-center`}>
            <Icon name="time" size={20} color="#F59E0B" style={tw`mr-2`} />
            Data e Hora da Visita *
          </Text>
          
          <TouchableOpacity 
            onPress={() => setShowDatePicker(true)}
            style={tw`border-2 border-gray-200 rounded-xl p-4 bg-gray-50 mb-4 flex-row justify-between items-center`}
          >
            <Text style={tw`text-gray-800 ${visitDate ? 'font-medium' : 'text-gray-400'}`}>
              {visitDate ? format(new Date(visitDate), "dd/MM/yyyy 'às' HH:mm") : 'Selecione a data e hora'}
            </Text>
            <Icon name="calendar" size={20} color="#6B7280" />
          </TouchableOpacity>

          <DatePicker
            modal
            open={showDatePicker}
            date={visitDate ? new Date(visitDate) : new Date()}
            mode="datetime"
            onConfirm={(selectedDate) => {
              setShowDatePicker(false);
              setVisitDate(selectedDate.toISOString());
            }}
            onCancel={() => {
              setShowDatePicker(false);
            }}
            title="Selecione a data e hora"
            confirmText="Confirmar"
            cancelText="Cancelar"
            locale="pt-BR"
          />
          
          <Text style={tw`text-lg font-semibold text-gray-800 mb-4 flex-row items-center`}>
            <Icon name="hourglass" size={20} color="#8B5CF6" style={tw`mr-2`} />
            Duração Estimada (opcional)
          </Text>
          
          <View style={tw`flex-row items-center`}>
            <View style={tw`flex-1 mr-2`}>
              <Text style={tw`text-sm text-gray-600 mb-1`}>Horas</Text>
              {/* No campo Horas */}
              <TextInput
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                value={hours}
                onChangeText={handleHoursChange} 
                keyboardType="numeric"
                maxLength={2}
                style={tw`border-2 border-gray-200 rounded-xl p-4 bg-gray-50 text-gray-800`}
              />
            </View>
            <View style={tw`flex-1 ml-2`}>
              <Text style={tw`text-sm text-gray-600 mb-1`}>Minutos</Text>
              {/* No campo Minutos */}
              <TextInput
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                value={minutes}
                onChangeText={handleMinutesChange}
                keyboardType="numeric"
                maxLength={2}
                style={tw`border-2 border-gray-200 rounded-xl p-4 bg-gray-50 text-gray-800`}
              />
            </View>
          </View>
          
          <Text style={tw`text-sm text-gray-500 mt-2`}>
            Selecione a data, hora e duração estimada da visita
          </Text>
        </View>

        {/* Seção Observações */}
        <View style={tw`bg-white rounded-xl p-6 shadow-sm mb-6`}>
          <Text style={tw`text-lg font-semibold text-gray-800 mb-4 flex-row items-center`}>
            <Icon name="document-text" size={20} color="#6366F1" style={tw`mr-2`} />
            Observações (opcional)
          </Text>
          
          <TextInput
            placeholder="Adicione observações sobre a visita..."
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            style={tw`border-2 border-gray-200 rounded-xl p-4 bg-gray-50 text-gray-800`}
          />
        </View>

        {/* Botão Agendar */}
        <TouchableOpacity
          onPress={handleScheduleVisit}
          disabled={!selectedVisitor || !selectedRoute || !visitDate || !currentUser || !visitReason}
          style={tw`rounded-xl p-5 ${
            !selectedVisitor || !selectedRoute || !visitDate || !currentUser || !visitReason
              ? 'bg-gray-300'
              : 'bg-blue-600'
          } shadow-sm`}
        >
          <Text style={tw`text-white text-center font-bold text-lg`}>
            <Icon name="calendar" size={20} color="white" style={tw`mr-2`} />
            Agendar Visita
          </Text>
        </TouchableOpacity>

        {/* Resumo da Seleção */}
        {(selectedVisitor || selectedRoute || currentUser || visitReason) && (
          <View style={tw`bg-blue-50 rounded-xl p-5 mt-6 border border-blue-200`}>
            <Text style={tw`text-blue-800 font-semibold mb-3`}>Resumo do Agendamento:</Text>
            
            {selectedVisitor && (
              <View style={tw`flex-row items-center mb-2`}>
                <Icon name="checkmark-circle" size={16} color="#10B981" style={tw`mr-2`} />
                <Text style={tw`text-blue-700`}>
                  Visitante: {visitors.find(v => v.id === selectedVisitor)?.name}
                </Text>
              </View>
            )}
            
            {selectedRoute && (
              <View style={tw`flex-row items-center mb-2`}>
                <Icon name="checkmark-circle" size={16} color="#10B981" style={tw`mr-2`} />
                <Text style={tw`text-blue-700`}>
                  Rota: {routes.find(r => r.id === selectedRoute)?.name_route}
                </Text>
              </View>
            )}

            {currentUser && (
              <View style={tw`flex-row items-center mb-2`}>
                <Icon name="checkmark-circle" size={16} color="#10B981" style={tw`mr-2`} />
                <Text style={tw`text-blue-700`}>
                  Agendado por: {currentUser.name}
                </Text>
              </View>
            )}
            
            {visitReason && (
              <View style={tw`flex-row items-center mb-2`}>
                <Icon name="checkmark-circle" size={16} color="#10B981" style={tw`mr-2`} />
                <Text style={tw`text-blue-700`}>
                  Motivo: {visitReason}
                </Text>
              </View>
            )}
            
            {visitDate && (
              <View style={tw`flex-row items-center mb-2`}>
                <Icon name="checkmark-circle" size={16} color="#10B981" style={tw`mr-2`} />
                <Text style={tw`text-blue-700`}>Data: {format(new Date(visitDate), "dd/MM/yyyy 'às' HH:mm")}</Text>
              </View>
            )}
            
            {(hours || minutes) && (
              <View style={tw`flex-row items-center mb-2`}>
                <Icon name="checkmark-circle" size={16} color="#10B981" style={tw`mr-2`} />
                <Text style={tw`text-blue-700`}>
                  Tempo estimado: {hours || '0'}h {minutes || '0'}min
                </Text>
              </View>
            )}
            
            {notes && (
              <View style={tw`flex-row items-start`}>
                <Icon name="checkmark-circle" size={16} color="#10B981" style={tw`mr-2 mt-1`} />
                <Text style={tw`text-blue-700 flex-1`}>Observações: {notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Controlar Agendamentos */}
        <TouchableOpacity 
            onPress={() => navigation.navigate('VisitasAgendadas')}
            style={tw`bg-indigo-600 flex-row items-center rounded-xl p-5 shadow-md my-2`}
        >
            <Icon name="help-circle" size={24} color="white" style={tw`mr-4`} />
            <View style={tw`flex-1`}>
                <Text style={tw`text-lg font-bold text-white`}>Gerenciar Agendamentos</Text>
                <Text style={tw`text-white opacity-90 text-sm`}>
                    Gerencie todos os agendamentos dos visitantes
                </Text>
            </View>
            <Icon name="chevron-forward" size={20} color="white" />
        </TouchableOpacity>

        {/* Voltar */}
        <TouchableOpacity
          onPress={() => navigation.navigate('OutrasFuncoes')}
          style={tw`mt-4 bg-gray-200 rounded-lg p-4`}
        >
          <Text style={tw`text-gray-800 font-medium text-center`}>Voltar</Text>
        </TouchableOpacity>

      </View>
      

    </ScrollView>
  );
}