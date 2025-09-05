const nfcService = require('../services/nfcService');

exports.readNfcTag = async (req, res) => {
  try {
    const { tagId } = req.body;
    const nfcData = await nfcService.processNfcTag(tagId);
    res.json(nfcData);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.writeNfcTag = async (req, res) => {
  try {
    const { tagId, data } = req.body;
    const result = await nfcService.writeToNfcTag(tagId, data);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

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