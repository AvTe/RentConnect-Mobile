import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    RefreshControl,
    ActivityIndicator,
    Image,
    Alert,
    Modal,
    Dimensions,
    Share,
    Linking,
    Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';

const STORAGE_BUCKET = 'agent-assets';

/**
 * Generate a share token (matches web implementation)
 * 12 chars, alphanumeric, excluding ambiguous chars (0, O, 1, l, I)
 */
const generateShareToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let token = '';
    for (let i = 0; i < 12; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
};

/**
 * Get usable URL for an asset.
 * Tries: public_url → storage_path (generate public URL) → file_url → null
 */
const getAssetUrl = (asset) => {
    if (asset.public_url && asset.public_url.startsWith('http')) return asset.public_url;
    if (asset.storage_path) {
        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(asset.storage_path);
        if (data?.publicUrl) return data.publicUrl;
    }
    // Legacy fallback — old records might have file_url with an http URL
    if (asset.file_url && asset.file_url.startsWith('http')) return asset.file_url;
    return null;
};

/**
 * Normalize a DB asset row so the rest of the screen can use .file_url consistently.
 */
const normalizeAsset = (row) => ({
    ...row,
    file_url: getAssetUrl(row),
    file_type: row.mime_type || row.file_type || '',
});

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Thumbnail component with error fallback — defined outside to avoid remounting
const SafeImage = ({ uri, style, fallbackIcon, fallbackColor, fallbackBg, resizeMode = 'cover' }) => {
    const [failed, setFailed] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        setFailed(false);
        setIsLoading(true);
    }, [uri]);

    if (!uri || failed) {
        return (
            <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: fallbackBg || '#DBEAFE' }]}>
                <Feather name={fallbackIcon || 'image'} size={32} color={fallbackColor || '#3B82F6'} />
            </View>
        );
    }

    return (
        <View style={style}>
            <Image
                source={{ uri }}
                style={{ width: '100%', height: '100%', borderRadius: style?.borderRadius || 0 }}
                resizeMode={resizeMode}
                onLoad={() => setIsLoading(false)}
                onError={() => setFailed(true)}
            />
            {isLoading && (
                <View style={{ ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: fallbackBg || '#DBEAFE' }}>
                    <ActivityIndicator size="small" color={fallbackColor || '#3B82F6'} />
                </View>
            )}
        </View>
    );
};

const COLORS = {
    primary: '#FE9200',
    primaryLight: '#FFF5E6',
    background: '#F8F9FB',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    error: '#EF4444',
    blue: '#3B82F6',
    blueLight: '#DBEAFE',
    purple: '#8B5CF6',
    purpleLight: '#EDE9FE',
};

const AgentAssetsScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { user, userData } = useAuth();
    const videoRef = useRef(null);

    // States
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [activeTab, setActiveTab] = useState('all'); // all, images, videos, documents

    // Data states
    const [assets, setAssets] = useState([]);
    const [folders, setFolders] = useState([]);
    const [storageUsage, setStorageUsage] = useState({
        totalUsed: 0,
        limit: 50 * 1024 * 1024,
        imageCount: 0,
        videoCount: 0,
        documentCount: 0,
    });

    // Modal states
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [previewModalVisible, setPreviewModalVisible] = useState(false);
    const [folderModalVisible, setFolderModalVisible] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [menuModalVisible, setMenuModalVisible] = useState(false);
    const [menuTarget, setMenuTarget] = useState(null);

    // Folder management modal states
    const [createFolderVisible, setCreateFolderVisible] = useState(false);
    const [editFolderVisible, setEditFolderVisible] = useState(false);
    const [editingFolder, setEditingFolder] = useState(null);
    const [folderForm, setFolderForm] = useState({ name: '', location: '', description: '' });
    const [folderSaving, setFolderSaving] = useState(false);

    // Move file to folder modal states
    const [moveFileVisible, setMoveFileVisible] = useState(false);
    const [movingAsset, setMovingAsset] = useState(null);
    const [movingToFolderId, setMovingToFolderId] = useState(null);

    // Media preview states
    const [mediaLoading, setMediaLoading] = useState(true);
    const [mediaError, setMediaError] = useState(false);

    // Reset media states when selected asset changes
    useEffect(() => {
        if (selectedAsset) {
            setMediaLoading(true);
            setMediaError(false);
        }
    }, [selectedAsset]);

    // Helper functions
    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getStoragePercentage = () => {
        return Math.min((storageUsage.totalUsed / storageUsage.limit) * 100, 100);
    };

    const getFileType = (mimeType, fileName) => {
        if (!mimeType && fileName) {
            const ext = fileName.split('.').pop()?.toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'image';
            if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
            if (['pdf'].includes(ext)) return 'pdf';
            if (['doc', 'docx'].includes(ext)) return 'doc';
            return 'file';
        }
        if (mimeType?.startsWith('image')) return 'image';
        if (mimeType?.startsWith('video')) return 'video';
        if (mimeType?.includes('pdf')) return 'pdf';
        if (mimeType?.includes('document') || mimeType?.includes('msword')) return 'doc';
        return 'file';
    };

    const getFileIcon = (type) => {
        switch (type) {
            case 'image': return 'image';
            case 'video': return 'video';
            case 'pdf': return 'file-text';
            case 'doc': return 'file';
            default: return 'file';
        }
    };

    const getFileIconBg = (type) => {
        switch (type) {
            case 'image': return COLORS.blueLight;
            case 'video': return COLORS.purpleLight;
            case 'pdf': return COLORS.primaryLight;
            case 'doc': return COLORS.successLight;
            default: return COLORS.background;
        }
    };

    const getFileIconColor = (type) => {
        switch (type) {
            case 'image': return COLORS.blue;
            case 'video': return COLORS.purple;
            case 'pdf': return COLORS.primary;
            case 'doc': return COLORS.success;
            default: return COLORS.textSecondary;
        }
    };

    // Fetch folders and assets from Supabase
    const fetchAssets = useCallback(async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            // Fetch folders with asset count (matches web: getAgentFolders)
            const { data: foldersData, error: foldersError } = await supabase
                .from('agent_asset_folders')
                .select('*, assets:agent_assets(count)')
                .eq('agent_id', user.id)
                .order('created_at', { ascending: false });

            if (!foldersError && foldersData) {
                const foldersWithCount = foldersData.map(f => ({
                    ...f,
                    assetCount: f.assets?.[0]?.count || 0,
                }));
                setFolders(foldersWithCount);
            }

            // Fetch all assets for this agent
            const { data: assetsData, error: assetsError } = await supabase
                .from('agent_assets')
                .select('*')
                .eq('agent_id', user.id)
                .order('created_at', { ascending: false });

            if (assetsError) {
                console.error('Assets error:', assetsError);
                throw assetsError;
            }

            const assetsList = (assetsData || []).map(normalizeAsset);

            // Calculate storage usage
            const totalUsed = assetsList.reduce((sum, asset) => sum + (asset.file_size || 0), 0);
            const imageCount = assetsList.filter(a => getFileType(a.file_type, a.file_name) === 'image').length;
            const videoCount = assetsList.filter(a => getFileType(a.file_type, a.file_name) === 'video').length;
            const documentCount = assetsList.filter(a =>
                !['image', 'video'].includes(getFileType(a.file_type, a.file_name))
            ).length;

            setStorageUsage({
                totalUsed,
                limit: 50 * 1024 * 1024,
                imageCount,
                videoCount,
                documentCount,
            });

            setAssets(assetsList);

        } catch (error) {
            console.error('Error fetching assets:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchAssets();
    }, [fetchAssets]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAssets();
    };

    // =============================================
    // FOLDER CRUD OPERATIONS (matches web lib/assets.js)
    // =============================================

    const handleCreateFolder = async () => {
        if (!folderForm.name.trim()) {
            toast.error('Please enter a folder name');
            return;
        }
        setFolderSaving(true);
        try {
            const shareToken = generateShareToken();
            const { data, error } = await supabase
                .from('agent_asset_folders')
                .insert({
                    agent_id: user.id,
                    name: folderForm.name.trim(),
                    location: folderForm.location.trim() || null,
                    description: folderForm.description.trim() || null,
                    share_token: shareToken,
                    is_shared: false,
                })
                .select()
                .single();

            if (error) throw error;

            setFolders(prev => [{ ...data, assetCount: 0 }, ...prev]);
            setCreateFolderVisible(false);
            setFolderForm({ name: '', location: '', description: '' });
            toast.success('Folder created!');
        } catch (error) {
            console.error('Create folder error:', error);
            toast.error('Failed to create folder');
        } finally {
            setFolderSaving(false);
        }
    };

    const handleEditFolder = async () => {
        if (!folderForm.name.trim() || !editingFolder) {
            toast.error('Please enter a folder name');
            return;
        }
        setFolderSaving(true);
        try {
            const { data, error } = await supabase
                .from('agent_asset_folders')
                .update({
                    name: folderForm.name.trim(),
                    location: folderForm.location.trim() || null,
                    description: folderForm.description.trim() || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', editingFolder.id)
                .select()
                .single();

            if (error) throw error;

            setFolders(prev => prev.map(f =>
                f.id === editingFolder.id ? { ...f, ...data } : f
            ));

            // If we're viewing this folder, update it too
            if (selectedFolder?.id === editingFolder.id) {
                setSelectedFolder(prev => ({ ...prev, ...data }));
            }

            setEditFolderVisible(false);
            setEditingFolder(null);
            setFolderForm({ name: '', location: '', description: '' });
            toast.success('Folder updated!');
        } catch (error) {
            console.error('Edit folder error:', error);
            toast.error('Failed to update folder');
        } finally {
            setFolderSaving(false);
        }
    };

    const handleDeleteFolder = (folder) => {
        Alert.alert(
            'Delete Folder',
            `Delete "${folder.name}" and all its files? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // 1. Get all assets' storage_path in the folder
                            const { data: folderAssets } = await supabase
                                .from('agent_assets')
                                .select('storage_path')
                                .eq('folder_id', folder.id);

                            // 2. Delete files from Supabase Storage
                            if (folderAssets?.length > 0) {
                                const paths = folderAssets
                                    .filter(a => a.storage_path)
                                    .map(a => a.storage_path);
                                if (paths.length > 0) {
                                    await supabase.storage.from(STORAGE_BUCKET).remove(paths);
                                }
                            }

                            // 3. Delete folder (FK cascade handles asset DB records)
                            const { error } = await supabase
                                .from('agent_asset_folders')
                                .delete()
                                .eq('id', folder.id)
                                .eq('agent_id', user.id);

                            if (error) throw error;

                            setFolders(prev => prev.filter(f => f.id !== folder.id));
                            if (folderModalVisible) setFolderModalVisible(false);
                            toast.success('Folder deleted');
                            fetchAssets(); // Refresh asset counts
                        } catch (error) {
                            console.error('Delete folder error:', error);
                            toast.error('Failed to delete folder');
                        }
                    },
                },
            ]
        );
    };

    const handleToggleFolderSharing = async (folder) => {
        try {
            const newStatus = !folder.is_shared;
            const { error } = await supabase
                .from('agent_asset_folders')
                .update({ is_shared: newStatus, updated_at: new Date().toISOString() })
                .eq('id', folder.id);

            if (error) throw error;

            setFolders(prev => prev.map(f =>
                f.id === folder.id ? { ...f, is_shared: newStatus } : f
            ));
            toast.success(newStatus ? 'Folder sharing enabled' : 'Folder sharing disabled');
        } catch (error) {
            console.error('Toggle sharing error:', error);
            toast.error('Failed to update sharing');
        }
    };

    // =============================================
    // MOVE FILE TO FOLDER
    // =============================================

    const handleMoveFile = async () => {
        if (!movingAsset) return;
        try {
            const { error } = await supabase
                .from('agent_assets')
                .update({
                    folder_id: movingToFolderId,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', movingAsset.id);

            if (error) throw error;

            // Update local state
            setAssets(prev => prev.map(a =>
                a.id === movingAsset.id ? { ...a, folder_id: movingToFolderId } : a
            ));

            setMoveFileVisible(false);
            setMovingAsset(null);
            setMovingToFolderId(null);

            const targetName = movingToFolderId
                ? folders.find(f => f.id === movingToFolderId)?.name || 'folder'
                : 'Uncategorized';
            toast.success(`Moved to "${targetName}"`);
            fetchAssets(); // Refresh folder counts
        } catch (error) {
            console.error('Move file error:', error);
            toast.error('Failed to move file');
        }
    };

    const openMoveFileModal = (asset) => {
        setMovingAsset(asset);
        setMovingToFolderId(asset.folder_id || null);
        setMoveFileVisible(true);
    };

    const openEditFolderModal = (folder) => {
        setEditingFolder(folder);
        setFolderForm({
            name: folder.name || '',
            location: folder.location || '',
            description: folder.description || '',
        });
        setEditFolderVisible(true);
    };

    const openCreateFolderModal = () => {
        setFolderForm({ name: '', location: '', description: '' });
        setCreateFolderVisible(true);
    };

    // File upload handler
    const handleUpload = async () => {
        Alert.alert(
            'Upload File',
            'Choose what to upload',
            [
                {
                    text: 'Photo/Video',
                    onPress: async () => {
                        try {
                            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                            if (status !== 'granted') {
                                Alert.alert('Permission Required', 'Please grant media library access.');
                                return;
                            }

                            const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.All,
                                allowsEditing: false,
                                quality: 0.8,
                            });

                            if (!result.canceled && result.assets?.[0]) {
                                await uploadFile(result.assets[0]);
                            }
                        } catch (error) {
                            console.error('Image picker error:', error);
                            toast.error('Failed to select file');
                        }
                    },
                },
                {
                    text: 'Document',
                    onPress: async () => {
                        try {
                            const result = await DocumentPicker.getDocumentAsync({
                                type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                                copyToCacheDirectory: true,
                            });

                            if (!result.canceled && result.assets?.[0]) {
                                await uploadFile(result.assets[0]);
                            }
                        } catch (error) {
                            console.error('Document picker error:', error);
                            toast.error('Failed to select document');
                        }
                    },
                },
                {
                    text: 'Take Photo',
                    onPress: async () => {
                        try {
                            const { status } = await ImagePicker.requestCameraPermissionsAsync();
                            if (status !== 'granted') {
                                Alert.alert('Permission Required', 'Please grant camera access.');
                                return;
                            }

                            const result = await ImagePicker.launchCameraAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                quality: 0.8,
                            });

                            if (!result.canceled && result.assets?.[0]) {
                                await uploadFile(result.assets[0]);
                            }
                        } catch (error) {
                            console.error('Camera error:', error);
                            toast.error('Failed to capture photo');
                        }
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const uploadFile = async (file) => {
        setUploading(true);
        try {
            const fileName = file.fileName || file.name || `file_${Date.now()}`;
            const mimeType = file.mimeType || file.type || 'application/octet-stream';
            const fileSize = file.fileSize || file.size || 0;

            // Determine file type category
            let fileTypeCategory = 'document';
            if (mimeType.startsWith('image')) fileTypeCategory = 'image';
            else if (mimeType.startsWith('video')) fileTypeCategory = 'video';

            // Generate unique storage path (matches web pattern)
            const timestamp = Date.now();
            const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `${user.id}/uncategorized/${timestamp}_${cleanName}`;

            // Read file as base64 for upload
            let publicUrl = null;
            let uploadedPath = null;

            try {
                // Read the file from local URI
                const fileInfo = await FileSystem.getInfoAsync(file.uri);
                if (!fileInfo.exists) throw new Error('File not found');

                const base64 = await FileSystem.readAsStringAsync(file.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                // Convert base64 to ArrayBuffer for upload
                const binaryStr = atob(base64);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                }

                // Upload to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from(STORAGE_BUCKET)
                    .upload(storagePath, bytes.buffer, {
                        contentType: mimeType,
                        cacheControl: '3600',
                        upsert: false,
                    });

                if (uploadError) {
                    console.error('Storage upload error:', uploadError);
                    throw uploadError;
                }

                uploadedPath = storagePath;

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from(STORAGE_BUCKET)
                    .getPublicUrl(storagePath);
                publicUrl = urlData?.publicUrl || null;

            } catch (storageErr) {
                console.error('Storage upload failed, saving record anyway:', storageErr);
                // Even if storage fails, we'll save the record with what we have
            }

            // Insert record into agent_assets table with correct columns
            const insertData = {
                agent_id: user.id,
                file_name: fileName,
                file_type: fileTypeCategory,
                mime_type: mimeType,
                file_size: fileSize,
                storage_path: uploadedPath || null,
                public_url: publicUrl || null,
                is_shared: false,
            };

            const { data: dbData, error: dbError } = await supabase
                .from('agent_assets')
                .insert(insertData)
                .select()
                .single();

            if (dbError) {
                console.error('DB insert error:', dbError);
                // Rollback storage if DB fails
                if (uploadedPath) {
                    await supabase.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
                }
                throw dbError;
            }

            // Add normalized asset to state
            const newAsset = normalizeAsset(dbData || insertData);
            setAssets(prev => [newAsset, ...prev]);
            toast.success('File uploaded successfully!');
            fetchAssets(); // Refresh to update counts

        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    // File actions
    const handleOpenFile = (asset) => {
        const type = getFileType(asset.file_type, asset.file_name);
        const url = asset.file_url;

        if (!url) {
            toast.error('File URL not available. Try re-uploading the file.');
            return;
        }

        if (type === 'image' || type === 'video') {
            setSelectedAsset(asset);
            setPreviewModalVisible(true);
        } else if (type === 'pdf' || type === 'doc') {
            // Open document in browser or native viewer
            WebBrowser.openBrowserAsync(url).catch(() => {
                Linking.openURL(url).catch(() => {
                    toast.error('Cannot open this document');
                });
            });
        } else {
            // Open any other file with native handler
            Linking.openURL(url).catch(() => {
                toast.info('Cannot open this file type');
            });
        }
    };

    // Open file with device's default media viewer
    const handleOpenInNativeViewer = async (asset) => {
        const url = asset.file_url;
        if (!url) {
            toast.error('File URL not available');
            return;
        }
        try {
            // Download to cache then open with native viewer
            const ext = asset.file_name?.split('.').pop() || 'tmp';
            const localUri = FileSystem.cacheDirectory + `asset_${Date.now()}.${ext}`;
            toast.info('Downloading file...');
            const { uri } = await FileSystem.downloadAsync(url, localUri);

            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(uri, {
                    mimeType: asset.file_type || '*/*',
                    dialogTitle: asset.file_name,
                    UTI: asset.file_type || 'public.data',
                });
            } else {
                // Fallback: open URL in browser
                await Linking.openURL(url);
            }
        } catch (error) {
            console.error('Native viewer error:', error);
            // Fallback to browser
            Linking.openURL(url).catch(() => toast.error('Cannot open file'));
        }
    };

    const handleShareFile = async (asset) => {
        const url = asset.file_url;
        if (!url) {
            toast.info('File sharing not available — no URL');
            return;
        }

        try {
            // Try native sharing by downloading first (gives better share sheet)
            const ext = asset.file_name?.split('.').pop() || 'tmp';
            const localUri = FileSystem.cacheDirectory + `share_${Date.now()}.${ext}`;

            const canNativeShare = await Sharing.isAvailableAsync();
            if (canNativeShare) {
                toast.info('Preparing file...');
                const { uri } = await FileSystem.downloadAsync(url, localUri);
                await Sharing.shareAsync(uri, {
                    mimeType: asset.file_type || '*/*',
                    dialogTitle: `Share ${asset.file_name}`,
                });
            } else {
                // Fallback: use RN Share with URL
                await Share.share({
                    message: `Check out this file: ${asset.file_name}\n${url}`,
                    url: Platform.OS === 'ios' ? url : undefined,
                    title: asset.file_name,
                });
            }
        } catch (error) {
            if (error.message !== 'User did not share') {
                console.error('Share error:', error);
                // Fallback to basic share
                try {
                    await Share.share({
                        message: `${asset.file_name}: ${url}`,
                        title: asset.file_name,
                    });
                } catch (e) {
                    toast.error('Sharing failed');
                }
            }
        }
    };

    const handleDeleteFile = (asset) => {
        Alert.alert(
            'Delete File',
            `Are you sure you want to delete "${asset.file_name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Delete from storage first
                            if (asset.storage_path) {
                                await supabase.storage
                                    .from(STORAGE_BUCKET)
                                    .remove([asset.storage_path]);
                            }

                            // Then delete DB record
                            await supabase
                                .from('agent_assets')
                                .delete()
                                .eq('id', asset.id);

                            setAssets(prev => prev.filter(a => a.id !== asset.id));
                            toast.success('File deleted');
                            fetchAssets();
                        } catch (error) {
                            console.error('Delete error:', error);
                            toast.error('Failed to delete file');
                        }
                    },
                },
            ]
        );
    };

    const handleEnableSharing = async (asset) => {
        try {
            // Toggle sharing status
            const newSharingStatus = !asset.is_shared;

            await supabase
                .from('agent_assets')
                .update({ is_shared: newSharingStatus })
                .eq('id', asset.id);

            setAssets(prev => prev.map(a =>
                a.id === asset.id ? { ...a, is_shared: newSharingStatus } : a
            ));

            toast.success(newSharingStatus ? 'Sharing enabled' : 'Sharing disabled');
        } catch (error) {
            console.error('Sharing error:', error);
            toast.error('Failed to update sharing');
        }
    };

    const openFolderMenu = (folder) => {
        setMenuTarget({ type: 'folder', data: folder });
        setMenuModalVisible(true);
    };

    const openFileMenu = (file) => {
        setMenuTarget({ type: 'file', data: file });
        setMenuModalVisible(true);
    };

    // Filter assets based on search and tab
    const filteredAssets = assets.filter(asset => {
        const folderName = asset.folder_id ? folders.find(f => f.id === asset.folder_id)?.name : '';
        const matchesSearch = !searchQuery ||
            asset.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (folderName && folderName.toLowerCase().includes(searchQuery.toLowerCase()));

        if (activeTab === 'all') return matchesSearch;
        const type = getFileType(asset.file_type, asset.file_name);
        if (activeTab === 'images') return matchesSearch && type === 'image';
        if (activeTab === 'videos') return matchesSearch && type === 'video';
        if (activeTab === 'documents') return matchesSearch && !['image', 'video'].includes(type);
        return matchesSearch;
    });

    // Folder Card (uses real agent_asset_folders data)
    const FolderCard = ({ folder }) => {
        const hasImage = folder.thumbnail_url;
        const fileCount = folder.assetCount || 0;

        return (
            <TouchableOpacity
                style={styles.propertyCard}
                onPress={() => {
                    setSelectedFolder(folder);
                    setFolderModalVisible(true);
                }}
                activeOpacity={0.8}
            >
                <View style={styles.propertyThumbnail}>
                    {hasImage ? (
                        <SafeImage
                            uri={folder.thumbnail_url}
                            style={styles.thumbnailImage}
                            fallbackIcon="folder"
                            fallbackColor={COLORS.primary}
                            fallbackBg={COLORS.primaryLight}
                        />
                    ) : (
                        <View style={styles.folderIconContainer}>
                            <Feather name="folder" size={40} color={COLORS.primary} />
                        </View>
                    )}
                    {folder.is_shared && (
                        <View style={styles.folderSharedBadge}>
                            <Feather name="link" size={10} color="#FFFFFF" />
                        </View>
                    )}
                </View>
                <View style={styles.propertyInfo}>
                    <View style={styles.propertyHeader}>
                        <Text style={styles.propertyName} numberOfLines={1}>{folder.name}</Text>
                        <TouchableOpacity onPress={() => openFolderMenu(folder)}>
                            <Feather name="more-vertical" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    {folder.location ? (
                        <View style={styles.propertyMeta}>
                            <Feather name="map-pin" size={12} color={COLORS.textSecondary} />
                            <Text style={styles.propertyLocation}>{folder.location}</Text>
                        </View>
                    ) : null}
                    <Text style={styles.propertyFileCount}>
                        {fileCount} file{fileCount !== 1 ? 's' : ''}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // File Item Component
    const FileItem = ({ file, showThumbnail = false }) => {
        const type = getFileType(file.file_type, file.file_name);

        return (
            <TouchableOpacity
                style={styles.fileItem}
                onPress={() => handleOpenFile(file)}
                activeOpacity={0.8}
            >
                {showThumbnail && type === 'image' && file.file_url ? (
                    <SafeImage
                        uri={file.file_url}
                        style={styles.fileThumbnail}
                        fallbackIcon="image"
                        fallbackColor={COLORS.blue}
                        fallbackBg={COLORS.blueLight}
                    />
                ) : (
                    <View style={[styles.fileIcon, { backgroundColor: getFileIconBg(type) }]}>
                        <Feather name={getFileIcon(type)} size={20} color={getFileIconColor(type)} />
                    </View>
                )}
                <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>{file.file_name}</Text>
                    <Text style={styles.fileMeta}>
                        {(file.folder_id && folders.find(f => f.id === file.folder_id)?.name) || 'Uncategorized'} • {formatBytes(file.file_size)}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => openFileMenu(file)}>
                    <Feather name="more-vertical" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    // Grid File Item
    const GridFileItem = ({ file }) => {
        const type = getFileType(file.file_type, file.file_name);

        return (
            <TouchableOpacity
                style={styles.gridItem}
                onPress={() => handleOpenFile(file)}
                activeOpacity={0.8}
            >
                {type === 'image' && file.file_url ? (
                    <SafeImage
                        uri={file.file_url}
                        style={styles.gridThumbnail}
                        fallbackIcon="image"
                        fallbackColor={COLORS.blue}
                        fallbackBg={COLORS.blueLight}
                    />
                ) : type === 'video' && file.file_url ? (
                    <View style={[styles.gridThumbnail, styles.videoThumbnail]}>
                        <Feather name="play-circle" size={32} color="#FFFFFF" />
                    </View>
                ) : (
                    <View style={[styles.gridThumbnail, { backgroundColor: getFileIconBg(type) }]}>
                        <Feather name={getFileIcon(type)} size={32} color={getFileIconColor(type)} />
                    </View>
                )}
                <Text style={styles.gridFileName} numberOfLines={2}>{file.file_name}</Text>
            </TouchableOpacity>
        );
    };

    // Tab Button
    const TabButton = ({ label, value, count }) => (
        <TouchableOpacity
            style={[styles.tabButton, activeTab === value && styles.tabButtonActive]}
            onPress={() => setActiveTab(value)}
        >
            <Text style={[styles.tabText, activeTab === value && styles.tabTextActive]}>
                {label}
            </Text>
            {count > 0 && (
                <View style={[styles.tabBadge, activeTab === value && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, activeTab === value && styles.tabBadgeTextActive]}>
                        {count}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );

    // Image/Video Preview Modal
    const PreviewModal = () => {
        if (!selectedAsset) return null;
        const type = getFileType(selectedAsset.file_type, selectedAsset.file_name);
        const hasUrl = !!selectedAsset.file_url;

        return (
            <Modal
                visible={previewModalVisible}
                animationType="fade"
                presentationStyle="fullScreen"
                onRequestClose={() => {
                    setPreviewModalVisible(false);
                    if (videoRef.current) {
                        videoRef.current.pauseAsync().catch(() => {});
                    }
                }}
            >
                <View style={styles.previewModal}>
                    {/* Close button */}
                    <TouchableOpacity
                        style={[styles.previewClose, { top: insets.top + 10 }]}
                        onPress={() => {
                            setPreviewModalVisible(false);
                            if (videoRef.current) {
                                videoRef.current.pauseAsync().catch(() => {});
                            }
                        }}
                    >
                        <View style={styles.previewCloseCircle}>
                            <Feather name="x" size={22} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>

                    {/* Media Content */}
                    <View style={styles.previewContent}>
                        {!hasUrl ? (
                            <View style={styles.previewErrorContainer}>
                                <Feather name="alert-circle" size={48} color="rgba(255,255,255,0.5)" />
                                <Text style={styles.previewErrorText}>File URL not available</Text>
                            </View>
                        ) : type === 'image' ? (
                            <View style={styles.previewMediaContainer}>
                                <Image
                                    source={{ uri: selectedAsset.file_url }}
                                    style={styles.previewImage}
                                    resizeMode="contain"
                                    onLoad={() => setMediaLoading(false)}
                                    onError={(e) => {
                                        console.error('Image load error:', e.nativeEvent?.error);
                                        setMediaLoading(false);
                                        setMediaError(true);
                                    }}
                                />
                                {mediaLoading && (
                                    <View style={styles.previewLoadingOverlay}>
                                        <ActivityIndicator size="large" color={COLORS.primary} />
                                        <Text style={styles.previewLoadingText}>Loading image...</Text>
                                    </View>
                                )}
                                {mediaError && (
                                    <View style={styles.previewErrorContainer}>
                                        <Feather name="image" size={48} color="rgba(255,255,255,0.5)" />
                                        <Text style={styles.previewErrorText}>Unable to load image</Text>
                                        <Text style={styles.previewErrorSub}>{selectedAsset.file_url?.substring(0, 60)}...</Text>
                                    </View>
                                )}
                            </View>
                        ) : type === 'video' ? (
                            <View style={styles.previewMediaContainer}>
                                <Video
                                    ref={videoRef}
                                    source={{ uri: selectedAsset.file_url }}
                                    style={styles.previewVideo}
                                    useNativeControls
                                    resizeMode={ResizeMode.CONTAIN}
                                    shouldPlay
                                    isLooping={false}
                                    onLoad={() => setMediaLoading(false)}
                                    onReadyForDisplay={() => setMediaLoading(false)}
                                    onError={(error) => {
                                        console.error('Video playback error:', error);
                                        setMediaLoading(false);
                                        setMediaError(true);
                                    }}
                                />
                                {mediaLoading && (
                                    <View style={styles.previewLoadingOverlay}>
                                        <ActivityIndicator size="large" color={COLORS.primary} />
                                        <Text style={styles.previewLoadingText}>Loading video...</Text>
                                    </View>
                                )}
                                {mediaError && (
                                    <View style={styles.previewErrorContainer}>
                                        <Feather name="video-off" size={48} color="rgba(255,255,255,0.5)" />
                                        <Text style={styles.previewErrorText}>Unable to play video</Text>
                                        <Text style={styles.previewErrorSub}>The video format may not be supported</Text>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={styles.previewErrorContainer}>
                                <Feather name="file" size={48} color="rgba(255,255,255,0.5)" />
                                <Text style={styles.previewErrorText}>Preview not available for this file type</Text>
                            </View>
                        )}
                    </View>

                    {/* File Info */}
                    <View style={styles.previewInfo}>
                        <Text style={styles.previewFileName} numberOfLines={2}>{selectedAsset.file_name}</Text>
                        <Text style={styles.previewFileMeta}>
                            {formatBytes(selectedAsset.file_size)}
                        </Text>
                    </View>

                    {/* Actions */}
                    <View style={[styles.previewActions, { paddingBottom: insets.bottom + 20 }]}>
                        <TouchableOpacity
                            style={styles.previewActionBtn}
                            onPress={() => handleShareFile(selectedAsset)}
                        >
                            <Feather name="share-2" size={18} color="#FFFFFF" />
                            <Text style={styles.previewActionText}>Share</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.previewActionBtn, { backgroundColor: 'rgba(59,130,246,0.2)' }]}
                            onPress={() => {
                                setPreviewModalVisible(false);
                                handleOpenInNativeViewer(selectedAsset);
                            }}
                        >
                            <Feather name="external-link" size={18} color="#3B82F6" />
                            <Text style={[styles.previewActionText, { color: '#3B82F6' }]}>Open In...</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.previewActionBtn, styles.previewActionDanger]}
                            onPress={() => {
                                setPreviewModalVisible(false);
                                handleDeleteFile(selectedAsset);
                            }}
                        >
                            <Feather name="trash-2" size={18} color="#EF4444" />
                            <Text style={[styles.previewActionText, { color: '#EF4444' }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    // Folder Detail Modal — shows folder's assets filtered by folder_id
    const FolderDetailModal = () => {
        if (!selectedFolder) return null;

        const folderAssets = assets.filter(a => a.folder_id === selectedFolder.id);

        return (
            <Modal
                visible={folderModalVisible}
                animationType="slide"
                onRequestClose={() => setFolderModalVisible(false)}
            >
                <View style={[styles.folderModal, { paddingTop: insets.top }]}>
                    <View style={styles.folderModalHeader}>
                        <TouchableOpacity onPress={() => setFolderModalVisible(false)}>
                            <Feather name="arrow-left" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                        <Text style={styles.folderModalTitle} numberOfLines={1}>{selectedFolder.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TouchableOpacity onPress={() => {
                                setFolderModalVisible(false);
                                openEditFolderModal(selectedFolder);
                            }}>
                                <Feather name="edit-2" size={20} color={COLORS.text} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => openFolderMenu(selectedFolder)}>
                                <Feather name="more-vertical" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Folder info bar */}
                    {(selectedFolder.location || selectedFolder.description) && (
                        <View style={styles.folderInfoBar}>
                            {selectedFolder.location ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Feather name="map-pin" size={13} color={COLORS.textSecondary} />
                                    <Text style={styles.folderInfoText}>{selectedFolder.location}</Text>
                                </View>
                            ) : null}
                            {selectedFolder.description ? (
                                <Text style={styles.folderInfoDesc} numberOfLines={2}>{selectedFolder.description}</Text>
                            ) : null}
                            {selectedFolder.is_shared && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                    <Feather name="link" size={13} color={COLORS.success} />
                                    <Text style={[styles.folderInfoText, { color: COLORS.success }]}>Shared</Text>
                                </View>
                            )}
                        </View>
                    )}

                    <ScrollView style={styles.folderContent}>
                        {/* Upload to folder button */}
                        <TouchableOpacity
                            style={styles.uploadToFolderBtn}
                            onPress={() => {
                                // Close folder modal, do upload, then the user can move it
                                setFolderModalVisible(false);
                                handleUpload();
                            }}
                        >
                            <Feather name="upload-cloud" size={18} color={COLORS.primary} />
                            <Text style={styles.uploadToFolderText}>Upload to this folder</Text>
                        </TouchableOpacity>

                        {folderAssets.length === 0 ? (
                            <View style={styles.emptyFolder}>
                                <Feather name="folder" size={48} color={COLORS.textSecondary} />
                                <Text style={styles.emptyTitle}>No files in this folder</Text>
                                <Text style={styles.emptyText}>Upload or move files here</Text>
                            </View>
                        ) : (
                            <View style={styles.folderGrid}>
                                {folderAssets.map(file => (
                                    <GridFileItem key={file.id} file={file} />
                                ))}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </Modal>
        );
    };

    // Context Menu Modal
    const MenuModal = () => (
        <Modal
            visible={menuModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setMenuModalVisible(false)}
        >
            <TouchableOpacity
                style={styles.menuOverlay}
                activeOpacity={1}
                onPress={() => setMenuModalVisible(false)}
            >
                <View style={styles.menuContainer}>
                    {menuTarget?.type === 'folder' ? (
                        <>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setMenuModalVisible(false);
                                    setSelectedFolder(menuTarget.data);
                                    setFolderModalVisible(true);
                                }}
                            >
                                <Feather name="folder" size={20} color={COLORS.text} />
                                <Text style={styles.menuText}>Open Folder</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setMenuModalVisible(false);
                                    openEditFolderModal(menuTarget.data);
                                }}
                            >
                                <Feather name="edit-2" size={20} color={COLORS.text} />
                                <Text style={styles.menuText}>Edit Folder</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setMenuModalVisible(false);
                                    handleToggleFolderSharing(menuTarget.data);
                                }}
                            >
                                <Feather name={menuTarget.data.is_shared ? 'link-2' : 'link'} size={20} color={COLORS.text} />
                                <Text style={styles.menuText}>
                                    {menuTarget.data.is_shared ? 'Disable Sharing' : 'Enable Sharing'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.menuItem, styles.menuItemDanger]}
                                onPress={() => {
                                    setMenuModalVisible(false);
                                    handleDeleteFolder(menuTarget.data);
                                }}
                            >
                                <Feather name="trash-2" size={20} color={COLORS.error} />
                                <Text style={[styles.menuText, { color: COLORS.error }]}>Delete Folder</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setMenuModalVisible(false);
                                    handleOpenFile(menuTarget.data);
                                }}
                            >
                                <Feather name="eye" size={20} color={COLORS.text} />
                                <Text style={styles.menuText}>Preview</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setMenuModalVisible(false);
                                    handleOpenInNativeViewer(menuTarget.data);
                                }}
                            >
                                <Feather name="external-link" size={20} color={COLORS.text} />
                                <Text style={styles.menuText}>Open In...</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setMenuModalVisible(false);
                                    openMoveFileModal(menuTarget.data);
                                }}
                            >
                                <Feather name="folder-plus" size={20} color={COLORS.text} />
                                <Text style={styles.menuText}>Move to Folder</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setMenuModalVisible(false);
                                    handleEnableSharing(menuTarget.data);
                                }}
                            >
                                <Feather name="share-2" size={20} color={COLORS.text} />
                                <Text style={styles.menuText}>
                                    {menuTarget?.data?.is_shared ? 'Disable Sharing' : 'Enable Sharing'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setMenuModalVisible(false);
                                    handleShareFile(menuTarget.data);
                                }}
                            >
                                <Feather name="send" size={20} color={COLORS.text} />
                                <Text style={styles.menuText}>Send</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.menuItem, styles.menuItemDanger]}
                                onPress={() => {
                                    setMenuModalVisible(false);
                                    handleDeleteFile(menuTarget.data);
                                }}
                            >
                                <Feather name="trash-2" size={20} color={COLORS.error} />
                                <Text style={[styles.menuText, { color: COLORS.error }]}>Delete</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </TouchableOpacity>
        </Modal>
    );

    // Create Folder Modal
    const CreateFolderModal = () => (
        <Modal
            visible={createFolderVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setCreateFolderVisible(false)}
        >
            <View style={styles.formModalOverlay}>
                <View style={styles.formModalContainer}>
                    <View style={styles.formModalHeader}>
                        <Text style={styles.formModalTitle}>New Folder</Text>
                        <TouchableOpacity onPress={() => setCreateFolderVisible(false)}>
                            <Feather name="x" size={22} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formModalBody}>
                        <Text style={styles.formLabel}>Folder Name *</Text>
                        <TextInput
                            style={styles.formInput}
                            placeholder="e.g. Sunset Apartments"
                            placeholderTextColor={COLORS.textSecondary}
                            value={folderForm.name}
                            onChangeText={(t) => setFolderForm(prev => ({ ...prev, name: t }))}
                            autoFocus
                        />

                        <Text style={styles.formLabel}>Location</Text>
                        <TextInput
                            style={styles.formInput}
                            placeholder="e.g. 123 Main St, City"
                            placeholderTextColor={COLORS.textSecondary}
                            value={folderForm.location}
                            onChangeText={(t) => setFolderForm(prev => ({ ...prev, location: t }))}
                        />

                        <Text style={styles.formLabel}>Description</Text>
                        <TextInput
                            style={[styles.formInput, styles.formTextArea]}
                            placeholder="Optional description..."
                            placeholderTextColor={COLORS.textSecondary}
                            value={folderForm.description}
                            onChangeText={(t) => setFolderForm(prev => ({ ...prev, description: t }))}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <View style={styles.formModalFooter}>
                        <TouchableOpacity
                            style={styles.formCancelBtn}
                            onPress={() => setCreateFolderVisible(false)}
                        >
                            <Text style={styles.formCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.formSaveBtn, folderSaving && { opacity: 0.6 }]}
                            onPress={handleCreateFolder}
                            disabled={folderSaving}
                        >
                            {folderSaving ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.formSaveText}>Create Folder</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Edit Folder Modal
    const EditFolderModal = () => (
        <Modal
            visible={editFolderVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setEditFolderVisible(false)}
        >
            <View style={styles.formModalOverlay}>
                <View style={styles.formModalContainer}>
                    <View style={styles.formModalHeader}>
                        <Text style={styles.formModalTitle}>Edit Folder</Text>
                        <TouchableOpacity onPress={() => setEditFolderVisible(false)}>
                            <Feather name="x" size={22} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formModalBody}>
                        <Text style={styles.formLabel}>Folder Name *</Text>
                        <TextInput
                            style={styles.formInput}
                            placeholder="Folder name"
                            placeholderTextColor={COLORS.textSecondary}
                            value={folderForm.name}
                            onChangeText={(t) => setFolderForm(prev => ({ ...prev, name: t }))}
                            autoFocus
                        />

                        <Text style={styles.formLabel}>Location</Text>
                        <TextInput
                            style={styles.formInput}
                            placeholder="e.g. 123 Main St, City"
                            placeholderTextColor={COLORS.textSecondary}
                            value={folderForm.location}
                            onChangeText={(t) => setFolderForm(prev => ({ ...prev, location: t }))}
                        />

                        <Text style={styles.formLabel}>Description</Text>
                        <TextInput
                            style={[styles.formInput, styles.formTextArea]}
                            placeholder="Optional description..."
                            placeholderTextColor={COLORS.textSecondary}
                            value={folderForm.description}
                            onChangeText={(t) => setFolderForm(prev => ({ ...prev, description: t }))}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <View style={styles.formModalFooter}>
                        <TouchableOpacity
                            style={styles.formCancelBtn}
                            onPress={() => setEditFolderVisible(false)}
                        >
                            <Text style={styles.formCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.formSaveBtn, folderSaving && { opacity: 0.6 }]}
                            onPress={handleEditFolder}
                            disabled={folderSaving}
                        >
                            {folderSaving ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.formSaveText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Move File to Folder Modal
    const MoveToFolderModal = () => {
        if (!movingAsset) return null;

        return (
            <Modal
                visible={moveFileVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setMoveFileVisible(false)}
            >
                <View style={styles.formModalOverlay}>
                    <View style={styles.formModalContainer}>
                        <View style={styles.formModalHeader}>
                            <Text style={styles.formModalTitle}>Move to Folder</Text>
                            <TouchableOpacity onPress={() => setMoveFileVisible(false)}>
                                <Feather name="x" size={22} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formModalBody}>
                            <Text style={styles.moveFileLabel}>
                                Moving: <Text style={{ fontFamily: 'DMSans_600SemiBold' }}>{movingAsset.file_name}</Text>
                            </Text>

                            <ScrollView style={styles.moveFileList} bounces={false}>
                                {/* Uncategorized option (no folder) */}
                                <TouchableOpacity
                                    style={[
                                        styles.moveFileOption,
                                        movingToFolderId === null && styles.moveFileOptionSelected,
                                    ]}
                                    onPress={() => setMovingToFolderId(null)}
                                >
                                    <Feather
                                        name="inbox"
                                        size={20}
                                        color={movingToFolderId === null ? COLORS.primary : COLORS.textSecondary}
                                    />
                                    <Text style={[
                                        styles.moveFileName,
                                        movingToFolderId === null && { color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' },
                                    ]}>Uncategorized</Text>
                                    {movingToFolderId === null && (
                                        <Feather name="check" size={18} color={COLORS.primary} />
                                    )}
                                </TouchableOpacity>

                                {/* Folder options */}
                                {folders.map(folder => (
                                    <TouchableOpacity
                                        key={folder.id}
                                        style={[
                                            styles.moveFileOption,
                                            movingToFolderId === folder.id && styles.moveFileOptionSelected,
                                        ]}
                                        onPress={() => setMovingToFolderId(folder.id)}
                                    >
                                        <Feather
                                            name="folder"
                                            size={20}
                                            color={movingToFolderId === folder.id ? COLORS.primary : COLORS.textSecondary}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[
                                                styles.moveFileName,
                                                movingToFolderId === folder.id && { color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' },
                                            ]}>{folder.name}</Text>
                                            {folder.location ? (
                                                <Text style={styles.moveFolderLocation}>{folder.location}</Text>
                                            ) : null}
                                        </View>
                                        {movingToFolderId === folder.id && (
                                            <Feather name="check" size={18} color={COLORS.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))}

                                {folders.length === 0 && (
                                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                                        <Text style={styles.moveFileLabel}>No folders yet. Create one first.</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>

                        <View style={styles.formModalFooter}>
                            <TouchableOpacity
                                style={styles.formCancelBtn}
                                onPress={() => setMoveFileVisible(false)}
                            >
                                <Text style={styles.formCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.formSaveBtn}
                                onPress={handleMoveFile}
                            >
                                <Text style={styles.formSaveText}>Move</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading assets...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.menuButton} onPress={() => navigation.goBack()}>
                    <Feather name="arrow-left" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Assets</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.headerIconBtn}
                        onPress={() => navigation.navigate('Notifications')}
                    >
                        <Feather name="bell" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[COLORS.primary]}
                    />
                }
            >
                {/* Storage Card */}
                <View style={styles.storageCard}>
                    <View style={styles.storageHeader}>
                        <View style={styles.storageIconContainer}>
                            <Feather name="cloud" size={24} color={COLORS.textSecondary} />
                        </View>
                        <View style={styles.storageInfo}>
                            <Text style={styles.storageTitle}>Storage Used</Text>
                            <Text style={styles.storageSubtitle}>
                                {formatBytes(storageUsage.limit - storageUsage.totalUsed)} remaining
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => navigation.navigate('BuyCredits')}>
                            <Text style={styles.upgradeText}>Upgrade</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.storageUsageRow}>
                        <Text style={styles.storageUsed}>{formatBytes(storageUsage.totalUsed)}</Text>
                        <Text style={styles.storageLimit}>/ {formatBytes(storageUsage.limit)}</Text>
                    </View>

                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: `${getStoragePercentage()}%` }]} />
                    </View>

                    {/* File Type Stats */}
                    <View style={styles.fileTypeStats}>
                        <View style={styles.fileTypeStat}>
                            <View style={[styles.fileTypeIcon, { backgroundColor: COLORS.blueLight }]}>
                                <Feather name="image" size={16} color={COLORS.blue} />
                            </View>
                            <Text style={styles.fileTypeCount}>{storageUsage.imageCount}</Text>
                            <Text style={styles.fileTypeLabel}>IMAGES</Text>
                        </View>
                        <View style={styles.fileTypeStat}>
                            <View style={[styles.fileTypeIcon, { backgroundColor: COLORS.purpleLight }]}>
                                <Feather name="video" size={16} color={COLORS.purple} />
                            </View>
                            <Text style={styles.fileTypeCount}>{storageUsage.videoCount}</Text>
                            <Text style={styles.fileTypeLabel}>VIDEOS</Text>
                        </View>
                        <View style={styles.fileTypeStat}>
                            <View style={[styles.fileTypeIcon, { backgroundColor: COLORS.primaryLight }]}>
                                <Feather name="file-text" size={16} color={COLORS.primary} />
                            </View>
                            <Text style={styles.fileTypeCount}>{storageUsage.documentCount}</Text>
                            <Text style={styles.fileTypeLabel}>DOCS</Text>
                        </View>
                    </View>
                </View>

                {/* Search & Filter Row */}
                <View style={styles.searchRow}>
                    <View style={styles.searchContainer}>
                        <Feather name="search" size={18} color={COLORS.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search assets..."
                            placeholderTextColor={COLORS.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity
                        style={styles.viewToggle}
                        onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    >
                        <Feather name={viewMode === 'grid' ? 'grid' : 'list'} size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Filter Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabsContainer}
                    contentContainerStyle={styles.tabsContent}
                >
                    <TabButton label="All" value="all" count={assets.length} />
                    <TabButton label="Images" value="images" count={storageUsage.imageCount} />
                    <TabButton label="Videos" value="videos" count={storageUsage.videoCount} />
                    <TabButton label="Documents" value="documents" count={storageUsage.documentCount} />
                </ScrollView>

                {/* Folders Section */}
                {activeTab === 'all' && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>FOLDERS</Text>
                            <TouchableOpacity
                                style={styles.newFolderBtn}
                                onPress={openCreateFolderModal}
                            >
                                <Feather name="folder-plus" size={14} color={COLORS.primary} />
                                <Text style={styles.newFolderBtnText}>New Folder</Text>
                            </TouchableOpacity>
                        </View>
                        {folders.length > 0 ? (
                            <View style={styles.propertiesGrid}>
                                {folders.map((folder) => (
                                    <FolderCard key={folder.id} folder={folder} />
                                ))}
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.emptyFolderCard}
                                onPress={openCreateFolderModal}
                                activeOpacity={0.8}
                            >
                                <Feather name="folder-plus" size={28} color={COLORS.primary} />
                                <Text style={styles.emptyFolderCardText}>Create your first folder</Text>
                                <Text style={styles.emptyFolderCardSub}>Organize your assets by property or project</Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}

                {/* Recent Files Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        {activeTab === 'all' ? 'RECENT FILES' : activeTab.toUpperCase()}
                    </Text>
                    <Text style={styles.fileCount}>{filteredAssets.length} items</Text>
                </View>

                {filteredAssets.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Feather name="file" size={48} color={COLORS.textSecondary} />
                        <Text style={styles.emptyTitle}>No files found</Text>
                        <Text style={styles.emptyText}>Upload files to see them here</Text>
                    </View>
                ) : viewMode === 'grid' ? (
                    <View style={styles.filesGrid}>
                        {filteredAssets.map((file) => (
                            <GridFileItem key={file.id} file={file} />
                        ))}
                    </View>
                ) : (
                    <View style={styles.filesList}>
                        {filteredAssets.map((file) => (
                            <FileItem key={file.id} file={file} showThumbnail />
                        ))}
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Floating Upload Button */}
            <TouchableOpacity
                style={[styles.fab, { bottom: insets.bottom + 20 }]}
                onPress={handleUpload}
                activeOpacity={0.9}
                disabled={uploading}
            >
                {uploading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <Feather name="plus" size={28} color="#FFFFFF" />
                )}
            </TouchableOpacity>

            {/* Modals */}
            {PreviewModal()}
            {FolderDetailModal()}
            {MenuModal()}
            {CreateFolderModal()}
            {EditFolderModal()}
            {MoveToFolderModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    menuButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerIconBtn: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    // Storage Card
    storageCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    storageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    storageIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    storageInfo: {
        flex: 1,
    },
    storageTitle: {
        fontSize: 15,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
    },
    storageSubtitle: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    upgradeText: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.primary,
    },
    storageUsageRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    storageUsed: {
        fontSize: 28,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
    },
    storageLimit: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        marginLeft: 6,
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: COLORS.border,
        borderRadius: 3,
        marginBottom: 16,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 3,
    },
    fileTypeStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    fileTypeStat: {
        alignItems: 'center',
    },
    fileTypeIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    fileTypeCount: {
        fontSize: 18,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
    },
    fileTypeLabel: {
        fontSize: 10,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
    },
    // Search
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.text,
    },
    viewToggle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    // Tabs
    tabsContainer: {
        marginBottom: 16,
    },
    tabsContent: {
        gap: 8,
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    tabButtonActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    tabText: {
        fontSize: 13,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    tabTextActive: {
        color: '#FFFFFF',
    },
    tabBadge: {
        marginLeft: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: COLORS.background,
    },
    tabBadgeActive: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    tabBadgeText: {
        fontSize: 11,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.textSecondary,
    },
    tabBadgeTextActive: {
        color: '#FFFFFF',
    },
    // Sections
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
    },
    fileCount: {
        fontSize: 12,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    // Properties Grid
    propertiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
        marginBottom: 24,
    },
    propertyCard: {
        width: '50%',
        paddingHorizontal: 6,
        marginBottom: 12,
    },
    propertyThumbnail: {
        borderRadius: 12,
        height: 100,
        overflow: 'hidden',
        marginBottom: 8,
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    folderIconContainer: {
        backgroundColor: COLORS.primaryLight,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    propertyInfo: {
        paddingHorizontal: 4,
    },
    propertyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    propertyName: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
        flex: 1,
    },
    propertyMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    propertyLocation: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
    },
    propertyFileCount: {
        fontSize: 11,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.primary,
        marginTop: 2,
    },
    // Files Grid
    filesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    gridItem: {
        width: (SCREEN_WIDTH - 48) / 3,
        margin: 4,
    },
    gridThumbnail: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 10,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoThumbnail: {
        backgroundColor: COLORS.text,
    },
    gridFileName: {
        fontSize: 11,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.text,
        marginTop: 4,
        textAlign: 'center',
    },
    // Files List
    filesList: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    fileThumbnail: {
        width: 44,
        height: 44,
        borderRadius: 10,
    },
    fileIcon: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fileInfo: {
        flex: 1,
        marginLeft: 12,
    },
    fileName: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
    },
    fileMeta: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    // Empty States
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyFolder: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 16,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
        marginTop: 12,
    },
    emptyText: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    // FAB
    fab: {
        position: 'absolute',
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    // Preview Modal
    previewModal: {
        flex: 1,
        backgroundColor: '#000000',
    },
    previewClose: {
        position: 'absolute',
        right: 16,
        zIndex: 10,
    },
    previewCloseCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewMediaContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.65,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.65,
    },
    previewVideo: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.55,
        backgroundColor: '#000',
    },
    previewLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    previewLoadingText: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: 'rgba(255,255,255,0.7)',
        marginTop: 12,
    },
    previewErrorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    previewErrorText: {
        fontSize: 16,
        fontFamily: 'DMSans_500Medium',
        color: 'rgba(255,255,255,0.7)',
        marginTop: 16,
        textAlign: 'center',
    },
    previewErrorSub: {
        fontSize: 11,
        fontFamily: 'DMSans_400Regular',
        color: 'rgba(255,255,255,0.4)',
        marginTop: 8,
        textAlign: 'center',
    },
    previewInfo: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        alignItems: 'center',
    },
    previewFileName: {
        fontSize: 16,
        fontFamily: 'DMSans_600SemiBold',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    previewFileMeta: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        color: 'rgba(255,255,255,0.7)',
        marginTop: 4,
    },
    previewActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        paddingBottom: 20,
        paddingHorizontal: 16,
    },
    previewActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    previewActionDanger: {
        backgroundColor: 'rgba(239,68,68,0.15)',
    },
    previewActionText: {
        fontSize: 13,
        fontFamily: 'DMSans_500Medium',
        color: '#FFFFFF',
    },
    // Folder Modal
    folderModal: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    folderModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    folderModalTitle: {
        fontSize: 18,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
    },
    folderContent: {
        flex: 1,
        padding: 16,
    },
    folderGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    // Menu Modal
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    menuContainer: {
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingVertical: 20,
        paddingHorizontal: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 14,
    },
    menuItemDanger: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        marginTop: 8,
        paddingTop: 22,
    },
    menuText: {
        fontSize: 16,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.text,
    },
    // Folder shared badge
    folderSharedBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: COLORS.success,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Folder info bar (inside FolderDetailModal)
    folderInfoBar: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    folderInfoText: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
    },
    folderInfoDesc: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    // Upload to folder button
    uploadToFolderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        marginBottom: 16,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        borderStyle: 'dashed',
        backgroundColor: COLORS.primaryLight,
    },
    uploadToFolderText: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.primary,
    },
    // New Folder button in section header
    newFolderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: COLORS.primaryLight,
    },
    newFolderBtnText: {
        fontSize: 12,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.primary,
    },
    // Empty folder card (create first folder CTA)
    emptyFolderCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 28,
        marginBottom: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
        backgroundColor: COLORS.card,
    },
    emptyFolderCardText: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
        marginTop: 8,
    },
    emptyFolderCardSub: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    // Form Modal (Create/Edit Folder + Move to Folder)
    formModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    formModalContainer: {
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%',
    },
    formModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    formModalTitle: {
        fontSize: 18,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
    },
    formModalBody: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    formLabel: {
        fontSize: 13,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
        marginBottom: 6,
        marginTop: 12,
    },
    formInput: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.text,
        backgroundColor: COLORS.background,
    },
    formTextArea: {
        minHeight: 72,
        textAlignVertical: 'top',
    },
    formModalFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 10,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    formCancelBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: COLORS.background,
    },
    formCancelText: {
        fontSize: 14,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    formSaveBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: COLORS.primary,
    },
    formSaveText: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: '#FFFFFF',
    },
    // Move file modal
    moveFileLabel: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        marginBottom: 10,
    },
    moveFileList: {
        maxHeight: 300,
    },
    moveFileOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 4,
    },
    moveFileOptionSelected: {
        backgroundColor: COLORS.primaryLight,
    },
    moveFileName: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.text,
    },
    moveFolderLocation: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        marginTop: 1,
    },
});

export default AgentAssetsScreen;

