import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, TouchableOpacity, ActivityIndicator, PermissionsAndroid, Platform, Modal, Linking } from 'react-native';
import { supabase } from '../services/supabase'; // Importando o cliente Supabase
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
/*
const FuncoesNFC = ({ selectedProntuario, navigateToProntuarioScreen, setLink, setShowPopup }) => {
    const [nfcWriting, setNfcWriting] = useState(false); // Estado de escrita do NFC
    const [nfcReading, setNfcReading] = useState(false); // Estado de leitura do NFC



    useEffect(() => {
        const loadData = async () => {
            //callLocation(); //MODIFIQUE E TIREI O AWAIT POIS TALVEZ FOSSE A ORIGEM DO PROBLEMA
            await fetchVisitors();
            //await fetchCurrentUser();
            //setLoading(false); // Defina loading como false após as operações
        };
    
        loadData();
    
        // Função para lidar com deep links
        const handleDeepLink = (event) => {
            const link = event.url;
            console.log('Deep link recebido:', link);
            const prontuarioId = link.split('/').pop();
            
            if (prontuarioId) {
                navigateToProntuarioScreen(prontuarioId);
            } else {
                console.warn('ID do prontuário não encontrado na URL.');
            }
        };
    
        // Adicionando listener para deep link
        const linkingListener = Linking.addListener('url', handleDeepLink);
    
        // Cleanup ao desmontar o componente
        return () => {
            linkingListener.remove(); // Remover o listener corretamente
        };
    }, []);
     


    const readTag = async () => {
        try {
            setNfcReading(true);
            await NfcManager.requestTechnology(NfcTech.Ndef);

            const tag = await NfcManager.getTag();
            console.log('Tag lida:', tag);

            if (tag.ndefMessage && tag.ndefMessage.length > 0) {
                const record = tag.ndefMessage[0];
                let decodedText = '';

                if (record.tnf === Ndef.TNF_WELL_KNOWN && record.type[0] === 0x55) {
                    // Decodificar URI (deep link)
                    decodedText = Ndef.uri.decodePayload(record.payload);
                }

                if (decodedText) {
                    setLink(decodedText); // Armazena o link no estado
                    setShowPopup(true); // Exibe o modal com o link (opcional)

                    // Extrair o ID do prontuário do deep link e navegar
                    const prontuarioId = decodedText.split('/').pop();
                    navigateToProntuarioScreen(prontuarioId);
                } else {
                    Alert.alert('Erro', 'Nenhum link válido encontrado na tag.');
                }
            } else {
                Alert.alert('Erro', 'Nenhuma mensagem NDEF encontrada na tag.');
            }
        } catch (ex) {
            console.warn('Erro ao ler a tag:', ex);
            Alert.alert('Erro', 'Falha ao ler a tag NFC.');
        } finally {
            await NfcManager.cancelTechnologyRequest();
            setNfcReading(false);
        }
    };

    const writeNfc = async () => {
        try {
            if (!selectedProntuario) {
                Alert.alert('Erro', 'Nenhum prontuário selecionado.');
                return;
            }

            setNfcWriting(true);
            await NfcManager.requestTechnology(NfcTech.Ndef);

            // Deep link para o prontuário
            const prontuarioId = selectedProntuario.id;
            const deepLink = `meuapp://prontuario/${prontuarioId}`;

            // Codificar o deep link em uma mensagem NDEF
            const bytes = Ndef.encodeMessage([Ndef.uriRecord(deepLink)]);

            if (bytes) {
                await NfcManager.ndefHandler.writeNdefMessage(bytes);
                Alert.alert('Sucesso', 'O deep link para o prontuário foi gravado no chip NFC!');
            } else {
                Alert.alert('Erro', 'Falha ao codificar a mensagem NDEF.');
            }
        } catch (ex) {
            console.warn(ex);
            Alert.alert('Erro', 'Falha ao gravar o deep link no chip NFC.');
        } finally {
            await NfcManager.cancelTechnologyRequest();
            setNfcWriting(false);
        }
    };

    const deleteNfc = async () => {
        try {
            setNfcWriting(true);
            await NfcManager.requestTechnology(NfcTech.Ndef);

            const emptyTextRecord = Ndef.textRecord(''); // Registro de texto vazio
            const bytes = Ndef.encodeMessage([emptyTextRecord]);
            if (bytes) {
                await NfcManager.ndefHandler.writeNdefMessage(bytes);
                Alert.alert('Sucesso', 'Os dados foram apagados do chip NFC!');
            } else {
                Alert.alert('Erro', 'Falha ao apagar a mensagem.');
            }
        } catch (ex) {
            console.warn(ex);
            Alert.alert('Erro', 'Falha ao apagar os dados no chip NFC.');
        } finally {
            await NfcManager.cancelTechnologyRequest();
            setNfcWriting(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

            <View style={styles.functionsContainer}>
                <Button title="Ler NFC" onPress={readTag} disabled={nfcReading} />
                <Button title="Escrever NFC" onPress={writeNfc} disabled={nfcWriting} />
                <Button title="Apagar NFC" onPress={deleteNfc} disabled={nfcWriting} />
            </View>


            <Modal visible={nfcReading} transparent={true}>
                <View style={styles.popupContainer}>
                    <View style={styles.popup}>
                        <Text style={styles.popupText}>
                            Aproxime o Chip NFC para realizar a leitura...
                        </Text>
                        {nfcReading && <ActivityIndicator size="large" color="#0000ff" />}
                    </View>
                </View>
            </Modal>

          
            <Modal visible={nfcWriting} transparent={true}>
                <View style={styles.popupContainer}>
                    <View style={styles.popup}>
                        <Text style={styles.popupText}>
                            Aproxime o Chip NFC para realizar a escrita ou apagar...
                        </Text>
                        {nfcWriting && <ActivityIndicator size="large" color="#0000ff" />}
                    </View>
                </View>
            </Modal>


        </ScrollView>

    );

};
*/
const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    contentContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    functionsContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    popupContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    popup: {
        width: 300,
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
        alignItems: 'center',
    },
    popupText: {
        fontSize: 16,
        marginBottom: 20,
        color: '#000000',
    },
});

export default FuncoesNFC;
