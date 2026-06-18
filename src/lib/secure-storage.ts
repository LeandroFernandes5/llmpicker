function store(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  try {
    return store()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  try {
    store()?.setItem(key, value);
  } catch {
    // ignore quota errors or disabled storage
  }
}

export async function deleteItemAsync(key: string): Promise<void> {
  try {
    store()?.removeItem(key);
  } catch {
    // ignore
  }
}
