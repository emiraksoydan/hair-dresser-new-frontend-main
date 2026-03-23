import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from 'expo-image-picker';
import { FileObject } from "../../types";
import { FieldValues, Path, UseFormSetValue } from 'react-hook-form';

/** HEIC/HEIF dosyalarını JPEG olarak yeniden adlandırır (expo-image-picker uri zaten JPEG içerir) */
const normalizeImageFile = (uri: string, fileName: string | null | undefined, type: string | undefined, index?: number): FileObject => {
  const rawName = fileName ?? `photo${index !== undefined ? `_${index}` : ''}.jpg`;
  const isHeic = /\.(heic|heif)$/i.test(rawName);
  return {
    uri,
    name: isHeic ? rawName.replace(/\.(heic|heif)$/i, '.jpg') : rawName,
    type: isHeic ? 'image/jpeg' : (type ?? 'image/jpeg'),
  };
};


export const pickPdf = async () => {
    const res = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "com.adobe.pdf"],
        multiple: false,
        copyToCacheDirectory: true,
    });
    if (res.canceled) return null;

    const f = res.assets[0];
    return {
        uri: f.uri,
        name: f.name ?? "document.pdf",
        size: f.size ?? undefined,
        mimeType: f.mimeType ?? undefined,
    };
};


export async function pickImageAndSet<TFieldValues extends FieldValues>(
    setValue: UseFormSetValue<TFieldValues>,
    name: Path<TFieldValues>
) {
    const file = await handlePickImage();
    if (file) {
        setValue(name, file as any, {
            shouldDirty: true,
            shouldValidate: true,
        });
    }
}

export const handlePickImage = async (): Promise<FileObject | null> => {
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
    });
    if (!result.canceled) {
        const file = result.assets[0];
        return normalizeImageFile(file.uri, file.fileName, file.type);
    }
    return null;
};

export const truncateFileName = (name: string, max = 40) =>
    name.length > max ? name.slice(0, max - 3) + "..." : name;

/**
 * Pick multiple images from gallery
 */
export const handlePickMultipleImages = async (maxImages: number = 3): Promise<FileObject[]> => {
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: maxImages,
        quality: 0.8,
    });

    if (!result.canceled && result.assets) {
        return result.assets.map((file, index) =>
            normalizeImageFile(file.uri, file.fileName, file.type, index)
        );
    }
    return [];
};

/**
 * Take a photo using camera
 */
export const handleTakePhoto = async (): Promise<FileObject | null> => {
    const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        return normalizeImageFile(file.uri, file.fileName, file.type);
    }
    return null;
};
