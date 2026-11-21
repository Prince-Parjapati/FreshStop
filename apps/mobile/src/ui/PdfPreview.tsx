import { Modal, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Button } from './kit';
import { useTheme } from './theme';

/** In-app preview of the exact HTML that becomes the PDF, with send / share / print / save actions. */
export function PdfPreview({ html, visible, onClose, onSend, onShare, onPrint, sending }: { html: string; visible: boolean; onClose: () => void; onSend: () => void; onShare: () => void; onPrint: () => void; sending?: boolean }) {
  const { c } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: 44 }}>
        <WebView originWhitelist={['*']} source={{ html: html.replace('<head>', '<head><meta name="viewport" content="width=device-width, initial-scale=1">') }} style={{ flex: 1, backgroundColor: '#fff' }} />
        <View style={{ padding: 12, gap: 8 }}>
          <Button label="Send on WhatsApp" onPress={onSend} loading={sending} />
          <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button kind="ghost" label="Share / Save PDF" onPress={onShare} /></View><View style={{ flex: 1 }}><Button kind="ghost" label="Print" onPress={onPrint} /></View></View>
          <Button kind="ghost" label="Close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
