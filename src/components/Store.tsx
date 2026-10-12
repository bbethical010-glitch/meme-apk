import StoreScreen from './store/StoreScreen';
import type { ProductId } from '../monetization/products';

export default function Store({
  onClose,
  initialFocus,
}: {
  onClose: () => void;
  initialFocus?: ProductId | null;
}) {
  return <StoreScreen onClose={onClose} initialFocus={initialFocus} />;
}
