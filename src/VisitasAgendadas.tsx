import React, { useState, useEffect } from 'react';
import { View, Text, Alert, FlatList, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import tw from 'tailwind-react-native-classnames';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigation } from '@react-navigation/native';

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
    { value: 'em_andamento', label: 'Em Andamento', color: '#8B5CF6', icon: 'walk' }
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