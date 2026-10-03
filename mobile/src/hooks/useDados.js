import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { normalizarErro } from '../services/api';
export default function useDados(loader) {
  const [result, setResult] = useState({ data: null, loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setResult((old) => ({ ...old, loading: true, error: '' }));
    loader().then((data) => { if (active) setResult({ data, loading: false, error: '' }); })
      .catch((error) => { if (active) setResult({ data: null, loading: false, error: normalizarErro(error) }); });
    return () => { active = false; };
  }, [loader, revision]));
  return { ...result, reload: () => setRevision((old) => old + 1) };
}
