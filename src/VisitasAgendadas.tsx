import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, FlatList, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import tw from 'tailwind-react-native-classnames';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigation } from '@react-navigation/native';
import { checkAndShowOverdueVisits, setupOverdueVisitsModal  } from '../functions/visitas_estouradas';

export default function VisitasAgendadas() {
  const [visitas, setVisitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVisita, setSelectedVisita] = useState(null);
  const [novoStatus, setNovoStatus] = useState('');

  const navigation = useNavigation();

  // Status disponíveis
  const statusOptions = [
      { value: 'confirmada', label: 'Confirmada', color: '#10B981', icon: 'checkmark-circle' },
      { value: 'cancelada', label: 'Cancelada', color: '#EF4444', icon: 'close-circle' },
      { value: 'concluida', label: 'Concluída', color: '#3B82F6', icon: 'checkmark-done-circle' },
      { value: 'pendente', label: 'Pendente', color: '#F59E0B', icon: 'time' },
      { value: 'em_andamento', label: 'Em Andamento', color: '#8B5CF6', icon: 'walk' } // Corrigido para underline
  ];

  // Buscar visitas agendadas
  const fetchVisitas = async () => {
    try {
      setRefreshing(true);
      
      const { data, error } = await supabase
        .from('visitor_agendamento')
        .select(`
          *,
          visitors:visitor_id (name),
          routes:route_id (name_route),
          agendador:created_by (name)
        `)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      setVisitas(data || []);
    } catch (error) {
      console.error('Erro ao buscar visitas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as visitas agendadas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVisitas();
  }, []);


  // Atualizar status da visita
  const atualizarStatus = async () => {
    if (!selectedVisita || !novoStatus) return;

    try {
      const { error } = await supabase
        .from('visitor_agendamento')
        .update({ 
          status: novoStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedVisita.id);

      if (error) throw error;

      Alert.alert('Sucesso', 'Status da visita atualizado com sucesso!');
      
      // Atualizar lista local
      setVisitas(visitas.map(visita =>
        visita.id === selectedVisita.id
          ? { ...visita, status: novoStatus }
          : visita
      ));
      
      setModalVisible(false);
      setSelectedVisita(null);
      setNovoStatus('');

    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status da visita');
    }
  };

  // Formatar data para exibição
  const formatarData = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  // Obter informações do status
  const getStatusInfo = (status) => {
    return statusOptions.find(opt => opt.value === status) || 
           { label: status, color: '#6B7280', icon: 'help-circle' };
  };


  // Botão para verificação manual
  const ManualCheckButton = () => (
    <TouchableOpacity
        onPress={checkAndShowOverdueVisits}
        style={tw`bg-yellow-500 rounded-lg p-3 mt-4`}
    >
        <Text style={tw`text-white text-center font-semibold`}>
            Verificar Visitas Atrasadas
        </Text>
    </TouchableOpacity>
  );

  const [overdueSearch, setOverdueSearch] = useState('');
  const [overduePage, setOverduePage] = useState(1);
  const OVERDUE_PER_PAGE = 2;
  const [overdueVisitsModal, setOverdueVisitsModal] = useState(false);
  const [overdueVisitsData, setOverdueVisitsData] = useState([]);

  // Filtrar visitas atrasadas pelo nome do visitante
  const filteredOverdueVisits = overdueVisitsData.filter(v =>
    v.visitorName.toLowerCase().includes(overdueSearch.toLowerCase())
  );

  // Calcular visitas da página atual
  const paginatedOverdueVisits = filteredOverdueVisits.slice(
    (overduePage - 1) * OVERDUE_PER_PAGE,
    overduePage * OVERDUE_PER_PAGE
  );

  const totalOverduePages = Math.ceil(filteredOverdueVisits.length / OVERDUE_PER_PAGE);

  useEffect(() => {
    setupOverdueVisitsModal(setOverdueVisitsModal, setOverdueVisitsData);
    setOverduePage(1);
  }, [overdueSearch]);

  // Modal para mostrar visitas atrasadas
  const OverdueVisitsModal = () => (
    <Modal
      visible={overdueVisitsModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setOverdueVisitsModal(false)}
    > 
      <View style={tw`flex-1 justify-center bg-black bg-opacity-50 p-4`}>
        <View style={tw`bg-white rounded-xl max-h-3/4`}>
          {/* Header */}
          <View style={tw`bg-red-50 rounded-t-xl p-4 border-b border-red-200`}>
            <View style={tw`flex-row justify-between items-center`}>
              <View style={tw`flex-row items-center`}>
                <Icon name="warning" size={24} color="#DC2626" />
                <Text style={tw`text-red-800 text-xl font-bold ml-2`}>
                  Visitas Atrasadas
                </Text>
              </View>
              <TouchableOpacity onPress={() => setOverdueVisitsModal(false)}>
                <Icon name="close" size={24} color="#DC2626" />
              </TouchableOpacity>
            </View>
            <Text style={tw`text-red-600 mt-1`}>
              {overdueVisitsData.length} visita(s) com tempo estourado
            </Text>
            
            {/* Campo de pesquisa - ADICIONADO AQUI */}
            <TextInput
              style={tw`border-2 border-red-200 rounded-xl p-2 mt-2 bg-white text-red-800`}
              placeholder="Pesquisar visitante atrasado..."
              placeholderTextColor="#DC2626"
              value={overdueSearch}
              onChangeText={setOverdueSearch}
            />
          </View>

          {/* Content */}
          <ScrollView style={tw`p-4`}>
            {paginatedOverdueVisits.map((visit, index) => (
              <View key={visit.id} style={tw`mb-4 p-3 bg-red-50 rounded-lg border border-red-200`}>
                {/* Header da visita */}
                <View style={tw`flex-row justify-between items-start mb-2`}>
                  <Text style={tw`text-red-800 font-bold text-lg flex-1`}>
                    {visit.visitorName}
                  </Text>
                  <View style={tw`bg-red-500 px-2 py-1 rounded-full`}>
                    <Text style={tw`text-white text-xs font-bold`}>
                      {formatOverdueTime(visit.overdueMinutes)}
                    </Text>
                  </View>
                </View>

                {/* Informações da visita */}
                <View style={tw`space-y-1`}>
                  <View style={tw`flex-row items-center`}>
                    <Icon name="time" size={14} color="#DC2626" />
                    <Text style={tw`text-red-700 text-sm ml-2`}>
                      Agendado: {visit.scheduledTime}
                    </Text>
                  </View>
                  <View style={tw`flex-row items-center`}>
                    <Icon name="alert-circle" size={14} color="#DC2626" />
                    <Text style={tw`text-red-700 text-sm ml-2`}>
                      Previsão: {visit.estimatedEndTime}
                    </Text>
                  </View>
                  <View style={tw`flex-row items-center`}>
                    <Icon name="document-text" size={14} color="#DC2626" />
                    <Text style={tw`text-red-700 text-sm ml-2`}>
                      Motivo: {visit.motivo}
                    </Text>
                  </View>
                  <View style={tw`flex-row items-center`}>
                    <Icon name="business" size={14} color="#DC2626" />
                    <Text style={tw`text-red-700 text-sm ml-2`}>
                      Duração: {visit.expectedDuration}
                    </Text>
                  </View>
                  <View style={tw`flex-row items-center`}>
                    <Icon name="location" size={14} color="#DC2626" />
                    <Text style={tw`text-red-700 text-sm ml-2`}>
                      Status: {visit.status}
                    </Text>
                  </View>
                </View>

                {/* Pavilhões planejados */}
                {visit.pavilions && visit.pavilions.length > 0 && (
                  <View style={tw`mt-2`}>
                    <Text style={tw`text-red-800 font-semibold text-sm mb-1`}>
                      Rota Planejada:
                    </Text>
                    <View style={tw`flex-row flex-wrap`}>
                      {visit.pavilions.map((pavilion, idx) => (
                        <View key={idx} style={tw`bg-white px-2 py-1 rounded mr-2 mb-1 border border-red-300`}>
                          <Text style={tw`text-red-700 text-xs`}>
                            {pavilion.order_number}. {pavilion.name || `Pav. ${pavilion.pavilion}`}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>       
            ))}
            {paginatedOverdueVisits.length === 0 && (
              <View style={tw`items-center py-6`}>
                <Icon name="alert-circle" size={32} color="#DC2626" />
                <Text style={tw`text-red-700 mt-2`}>
                  {overdueSearch ? 'Nenhum visitante encontrado' : 'Nenhum visitante atrasado encontrado'}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Paginação */}
          {totalOverduePages > 1 && (
            <View style={tw`flex-row justify-center items-center mb-2`}>
              <TouchableOpacity
                onPress={() => overduePage > 1 && setOverduePage(overduePage - 1)}
                disabled={overduePage === 1}
                style={tw`px-3 py-2 mx-1 rounded bg-red-200 ${overduePage === 1 ? 'opacity-50' : ''}`}
              >
                <Text style={tw`text-red-700`}>Anterior</Text>
              </TouchableOpacity>
              <Text style={tw`mx-2 text-red-700`}>
                Página {overduePage} de {totalOverduePages}
              </Text>
              <TouchableOpacity
                onPress={() => overduePage < totalOverduePages && setOverduePage(overduePage + 1)}
                disabled={overduePage === totalOverduePages}
                style={tw`px-3 py-2 mx-1 rounded bg-red-200 ${overduePage === totalOverduePages ? 'opacity-50' : ''}`}
              >
                <Text style={tw`text-red-700`}>Próxima</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Footer */}
          <View style={tw`p-4 border-t border-red-200`}>
            <TouchableOpacity
              onPress={() => setOverdueVisitsModal(false)}
              style={tw`bg-red-600 rounded-lg py-3`}
            >
              <Text style={tw`text-white text-center font-semibold`}>
                Fechar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Função auxiliar para formatar tempo
  const formatOverdueTime = (minutes) => {
      if (minutes < 60) {
          return `${minutes} min atrasado`;
      } else {
          const hours = Math.floor(minutes / 60);
          const remainingMinutes = minutes % 60;
          return `${hours}h ${remainingMinutes}min atrasado`;
      }
  };

  // Renderizar item da lista
  const renderVisitaItem = ({ item }) => {
    const statusInfo = getStatusInfo(item.status);
    
    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedVisita(item);
          setNovoStatus(item.status);
          setModalVisible(true);
        }}
        style={tw`bg-white rounded-xl p-5 mb-4 shadow-sm border-l-4`}
        style={{ ...tw`bg-white rounded-xl p-5 mb-4 shadow-sm`, borderLeftColor: statusInfo.color, borderLeftWidth: 4 }}
      >
        <View style={tw`flex-row justify-between items-start mb-3`}>
          <View style={tw`flex-1`}>
            <Text style={tw`text-lg font-bold text-gray-800`}>
              {item.visitors?.name || 'Visitante não encontrado'}
            </Text>
            <Text style={tw`text-gray-600 text-sm`}>
              {item.visitors?.email}
            </Text>
          </View>
          
          <View style={tw`flex-row items-center bg-${statusInfo.color.replace('#', '')}50 px-3 py-1 rounded-full`}>
            <Icon name={statusInfo.icon} size={16} color={statusInfo.color} style={tw`mr-1`} />
            <Text style={[tw`text-sm font-medium`, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <View style={tw`mb-3`}>
          <View style={tw`flex-row items-center mb-1`}>
            <Icon name="map" size={16} color="#10B981" style={tw`mr-2`} />
            <Text style={tw`text-gray-700`}>
              Rota: {item.routes?.name_route || 'N/A'}
            </Text>
          </View>

          <View style={tw`flex-row items-center mb-1`}>
            <Icon name="calendar" size={16} color="#3B82F6" style={tw`mr-2`} />
            <Text style={tw`text-gray-700`}>
              {formatarData(item.scheduled_time || item.scheduled_date)}
            </Text>
          </View>

          {item.expected_duration && (
            <View style={tw`flex-row items-center mb-1`}>
              <Icon name="time" size={16} color="#F59E0B" style={tw`mr-2`} />
              <Text style={tw`text-gray-700`}>
                Duração: {item.expected_duration}
              </Text>
            </View>
          )}

          <View style={tw`flex-row items-center mb-1`}>
            <Icon name="person" size={16} color="#6366F1" style={tw`mr-2`} />
            <Text style={tw`text-gray-700`}>
              Agendado por: {item.agendador?.name || 'N/A'}
            </Text>
          </View>

          {item.motivo_da_visita && (
            <View style={tw`flex-row items-start`}>
              <Icon name="document-text" size={16} color="#8B5CF6" style={tw`mr-2 mt-1`} />
              <Text style={tw`text-gray-700 flex-1`}>
                Motivo: {item.motivo_da_visita}
              </Text>
            </View>
          )}
        </View>

        {item.notes && (
          <View style={tw`bg-gray-50 p-3 rounded-lg`}>
            <Text style={tw`text-sm text-gray-600`}>
              <Text style={tw`font-semibold`}>Observações: </Text>
              {item.notes}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={() => {
            setSelectedVisita(item);
            setNovoStatus(item.status);
            setModalVisible(true);
          }}
          style={tw`mt-3 flex-row items-center justify-center bg-gray-100 py-2 rounded-lg`}
        >
          <Icon name="swap-vertical" size={16} color="#6B7280" style={tw`mr-2`} />
          <Text style={tw`text-gray-700 text-sm font-medium`}>
            Alterar Status
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={tw`mt-4 text-gray-600`}>Carregando visitas...</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`bg-white p-6 shadow-sm`}>
        <View style={tw`flex-row items-center mb-2`}>
          <Icon name="calendar" size={28} color="#3B82F6" style={tw`mr-3`} />
          <Text style={tw`text-2xl font-bold text-gray-800`}>Visitas Agendadas</Text>
        </View>
        <Text style={tw`text-gray-600`}>
          Gerencie e acompanhe o status das visitas agendadas
        </Text>
        <ManualCheckButton />
      </View>

      {/* Lista de visitas */}
      <FlatList
        data={visitas}
        renderItem={renderVisitaItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={tw`p-4`}
        refreshing={refreshing}
        onRefresh={fetchVisitas}
        ListEmptyComponent={
          <View style={tw`items-center justify-center py-10`}>
            <Icon name="calendar-outline" size={48} color="#9CA3AF" />
            <Text style={tw`text-gray-500 text-lg mt-4`}>Nenhuma visita agendada</Text>
            <Text style={tw`text-gray-400 text-center mt-2`}>
              Não há visitas agendadas no momento.
            </Text>
          </View>
        }
      />

      {/* Modal de visitas atrasadas */}
      <OverdueVisitsModal />

      {/* Modal para alterar status */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
          <View style={tw`bg-white rounded-xl p-6 w-11/12 max-w-md`}>
            <Text style={tw`text-xl font-bold text-gray-800 mb-4`}>
              Alterar Status da Visita
            </Text>

            {selectedVisita && (
              <>
                <Text style={tw`text-gray-700 mb-2`}>
                  <Text style={tw`font-semibold`}>Visitante: </Text>
                  {selectedVisita.visitors?.name}
                </Text>
                <Text style={tw`text-gray-700 mb-4`}>
                  <Text style={tw`font-semibold`}>Data: </Text>
                  {formatarData(selectedVisita.scheduled_time || selectedVisita.scheduled_date)}
                </Text>
              </>
            )}

            <Text style={tw`text-lg font-semibold text-gray-800 mb-3`}>
              Selecione o novo status:
            </Text>

            {statusOptions.map((status) => (
              <TouchableOpacity
                key={status.value}
                onPress={() => setNovoStatus(status.value)}
                style={tw`flex-row items-center p-3 mb-2 rounded-lg ${
                  novoStatus === status.value ? 'bg-gray-100' : 'bg-white'
                } border border-gray-200`}
              >
                <View style={[tw`w-4 h-4 rounded-full mr-3`, { backgroundColor: status.color }]} />
                <Icon name={status.icon} size={20} color={status.color} style={tw`mr-3`} />
                <Text style={tw`text-gray-800 font-medium`}>{status.label}</Text>
                {novoStatus === status.value && (
                  <Icon name="checkmark" size={20} color="#10B981" style={tw`ml-auto`} />
                )}
              </TouchableOpacity>
            ))}

            <View style={tw`flex-row justify-between mt-6`}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={tw`flex-1 mr-2 bg-gray-300 py-3 rounded-lg items-center`}
              >
                <Text style={tw`text-gray-800 font-medium`}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={atualizarStatus}
                disabled={!novoStatus || novoStatus === selectedVisita?.status}
                style={tw`flex-1 ml-2 ${
                  !novoStatus || novoStatus === selectedVisita?.status
                    ? 'bg-gray-400'
                    : 'bg-blue-600'
                } py-3 rounded-lg items-center`}
              >
                <Text style={tw`text-white font-medium`}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

        {/* Voltar */}
        <TouchableOpacity
            onPress={() => navigation.navigate('OutrasFuncoes')}
            style={tw`mt-4 bg-gray-200 rounded-lg p-4`}
        >
            <Text style={tw`text-gray-800 font-medium text-center`}>Voltar</Text>
        </TouchableOpacity>


    </View>
  );
}