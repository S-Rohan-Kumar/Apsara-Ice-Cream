import { Provider }      from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import store             from './store';
import AppRouter         from './router/AppRouter';
import Toast             from './components/common/Toast';
import ConfirmDialog     from './components/common/ConfirmDialog';
 
export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppRouter />
        <Toast />
        <ConfirmDialog />
      </BrowserRouter>
    </Provider>
  );
}
