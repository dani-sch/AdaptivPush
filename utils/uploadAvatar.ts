import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { toByteArray } from 'base64-js';
import { supabase } from '@/utils/supabase';

/**
 * Launches the image library, resizes the selected photo to 400×400,
 * uploads it to the `avatars` Supabase Storage bucket under the user's
 * UID folder, and returns the public URL.
 *
 * Returns null if the user cancelled or an error occurred.
 */
export async function uploadAvatar(userId: string): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) return null;

  const resized = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 400, height: 400 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );

  // Read as base64 then decode to bytes — reliable binary upload in React Native
  const base64 = await readAsStringAsync(resized.uri, { encoding: EncodingType.Base64 });
  const bytes = toByteArray(base64);

  const path = `${userId}/${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, { upsert: true, contentType: 'image/jpeg' });

  if (uploadError) {
    console.error('Avatar upload failed:', uploadError.message);
    return null;
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}
