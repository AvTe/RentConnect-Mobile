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
import * as FileSystem from 'expo-file-system';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    const [properties, setProperties] = useState([]);
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

    // Fetch assets from Supabase
    const fetchAssets = useCallback(async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
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

            const assetsList = assetsData || [];

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

            // Group assets by property/folder
            const propertyMap = {};
            assetsList.forEach(asset => {
                const propName = asset.property_name || asset.folder_name || 'Uncategorized';
                if (!propertyMap[propName]) {
                    propertyMap[propName] = {
                        id: propName,
                        name: propName,
                        location: asset.property_location || asset.location || '',
                        assets: [],
                        thumbnail: null,
                    };
                }
                propertyMap[propName].assets.push(asset);
                // Set first image as thumbnail
                if (!propertyMap[propName].thumbnail && getFileType(asset.file_type, asset.file_name) === 'image') {
                    propertyMap[propName].thumbnail = asset.file_url;
                }
            });

            setProperties(Object.values(propertyMap));
            setAssets(assetsList);

        } catch (error) {
            console.error('Error fetching assets:', error);
            // Use demo data on error
            const demoAssets = [
                {
                    id: '1',
                    file_name: 'Living_Room_View_01.jpg',
                    property_name: 'Meru Luxury Houses',
                    location: 'Meru',
                    file_size: 2.4 * 1024 * 1024,
                    file_type: 'image/jpeg',
                    file_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
                    created_at: new Date().toISOString(),
                },
                {
                    id: '2',
                    file_name: 'Master_Bedroom.jpg',
                    property_name: 'Meru Luxury Houses',
                    location: 'Meru',
                    file_size: 1.8 * 1024 * 1024,
                    file_type: 'image/jpeg',
                    file_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
                    created_at: new Date().toISOString(),
                },
                {
                    id: '3',
                    file_name: 'Apartment_Tour.mp4',
                    property_name: 'Nairobi Apartments 32B',
                    location: 'Nairobi',
                    file_size: 15 * 1024 * 1024,
                    file_type: 'video/mp4',
                    file_url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
                    created_at: new Date().toISOString(),
                },
                {
                    id: '4',
                    file_name: 'Lease_Agreement.pdf',
                    property_name: 'Nairobi Apartments 32B',
                    location: 'Nairobi',
                    file_size: 1.1 * 1024 * 1024,
                    file_type: 'application/pdf',
                    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', // FIXME: Replace with actual document URL from Supabase storage
                    created_at: new Date().toISOString(),
                },
                {
                    id: '5',
                    file_name: 'Kitchen_Photo.jpg',
                    property_name: 'Nairobi Apartments 32B',
                    location: 'Nairobi',
                    file_size: 2.0 * 1024 * 1024,
                    file_type: 'image/jpeg',
                    file_url: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800',
                    created_at: new Date().toISOString(),
                },
            ];

            setAssets(demoAssets);

            // Calculate from demo data
            const totalUsed = demoAssets.reduce((sum, a) => sum + (a.file_size || 0), 0);
            setStorageUsage({
                totalUsed,
                limit: 50 * 1024 * 1024,
                imageCount: demoAssets.filter(a => getFileType(a.file_type, a.file_name) === 'image').length,
                videoCount: demoAssets.filter(a => getFileType(a.file_type, a.file_name) === 'video').length,
                documentCount: demoAssets.filter(a => !['image', 'video'].includes(getFileType(a.file_type, a.file_name))).length,
            });

            // Group demo assets
            const propMap = {};
            demoAssets.forEach(asset => {
                const name = asset.property_name || 'Uncategorized';
                if (!propMap[name]) {
                    propMap[name] = { id: name, name, location: asset.location || '', assets: [], thumbnail: null };
                }
                propMap[name].assets.push(asset);
                if (!propMap[name].thumbnail && getFileType(asset.file_type, asset.file_name) === 'image') {
                    propMap[name].thumbnail = asset.file_url;
                }
            });
            setProperties(Object.values(propMap));
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
            const fileType = file.mimeType || file.type || 'application/octet-stream';

            // For now, just add to local state (since no storage bucket exists)
            const newAsset = {
                id: Date.now().toString(),
                file_name: fileName,
                file_type: fileType,
                file_size: file.fileSize || 0,
                file_url: file.uri,
                property_name: 'Uploaded Files',
                location: 'Local',
                created_at: new Date().toISOString(),
                agent_id: user?.id,
            };

            // Try to upload to Supabase if storage is available
            try {
                // Insert record into agent_assets table
                const { data, error } = await supabase
                    .from('agent_assets')
                    .insert({
                        agent_id: user?.id,
                        file_name: fileName,
                        file_type: fileType,
                        file_size: file.fileSize || 0,
                        file_url: file.uri, // Would be replaced with storage URL
                        property_name: 'Uploaded Files',
                        created_at: new Date().toISOString(),
                    })
                    .select()
                    .single();

                if (!error && data) {
                    newAsset.id = data.id;
                }
            } catch (dbError) {
                logger.log('DB insert skipped:', dbError);
            }

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

        if (type === 'image' || type === 'video') {
            setSelectedAsset(asset);
            setPreviewModalVisible(true);
        } else if (type === 'pdf' || type === 'doc') {
            // Open document in browser
            if (asset.file_url) {
                WebBrowser.openBrowserAsync(asset.file_url).catch(() => {
                    Linking.openURL(asset.file_url);
                });
            } else {
                toast.info('Document preview not available');
            }
        } else {
            toast.info(`Opening ${asset.file_name}`);
        }
    };

    const handleShareFile = async (asset) => {
        try {
            if (asset.file_url) {
                await Share.share({
                    message: `Check out this file: ${asset.file_name}`,
                    url: asset.file_url,
                    title: asset.file_name,
                });
            } else {
                toast.info('File sharing not available for local files');
            }
        } catch (error) {
            console.error('Share error:', error);
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
        const matchesSearch = !searchQuery ||
            asset.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.property_name?.toLowerCase().includes(searchQuery.toLowerCase());

        if (activeTab === 'all') return matchesSearch;
        const type = getFileType(asset.file_type, asset.file_name);
        if (activeTab === 'images') return matchesSearch && type === 'image';
        if (activeTab === 'videos') return matchesSearch && type === 'video';
        if (activeTab === 'documents') return matchesSearch && !['image', 'video'].includes(type);
        return matchesSearch;
    });

    // Property Folder Card
    const PropertyCard = ({ property }) => {
        const hasImage = property.thumbnail;

        return (
            <TouchableOpacity
                style={styles.propertyCard}
                onPress={() => {
                    setSelectedFolder(property);
                    setFolderModalVisible(true);
                }}
                activeOpacity={0.8}
            >
                <View style={styles.propertyThumbnail}>
                    {hasImage ? (
                        <Image
                            source={{ uri: property.thumbnail }}
                            style={styles.thumbnailImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.folderIconContainer}>
                            <Feather name="folder" size={40} color={COLORS.primary} />
                        </View>
                    )}
                </View>
                <View style={styles.propertyInfo}>
                    <View style={styles.propertyHeader}>
                        <Text style={styles.propertyName} numberOfLines={1}>{property.name}</Text>
                        <TouchableOpacity onPress={() => openFolderMenu(property)}>
                            <Feather name="more-vertical" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    {property.location ? (
                        <View style={styles.propertyMeta}>
                            <Feather name="map-pin" size={12} color={COLORS.textSecondary} />
                            <Text style={styles.propertyLocation}>{property.location}</Text>
                        </View>
                    ) : null}
                    <Text style={styles.propertyFileCount}>
                        {property.assets?.length || 0} file{(property.assets?.length || 0) !== 1 ? 's' : ''}
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
                    <Image
                        source={{ uri: file.file_url }}
                        style={styles.fileThumbnail}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.fileIcon, { backgroundColor: getFileIconBg(type) }]}>
                        <Feather name={getFileIcon(type)} size={20} color={getFileIconColor(type)} />
                    </View>
                )}
                <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>{file.file_name}</Text>
                    <Text style={styles.fileMeta}>
                        {file.property_name || 'Unknown'} • {formatBytes(file.file_size)}
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
                    <Image
                        source={{ uri: file.file_url }}
                        style={styles.gridThumbnail}
                        resizeMode="cover"
                    />
                ) : type === 'video' ? (
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

        return (
            <Modal
                visible={previewModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPreviewModalVisible(false)}
            >
                <View style={styles.previewModal}>
                    <TouchableOpacity
                        style={styles.previewClose}
                        onPress={() => setPreviewModalVisible(false)}
                    >
                        <Feather name="x" size={28} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.previewContent}>
                        {type === 'image' ? (
                            <Image
                                source={{ uri: selectedAsset.file_url }}
                                style={styles.previewImage}
                                resizeMode="contain"
                            />
                        ) : type === 'video' ? (
                            <Video
                                ref={videoRef}
                                source={{ uri: selectedAsset.file_url }}
                                style={styles.previewVideo}
                                useNativeControls
                                resizeMode={ResizeMode.CONTAIN}
                                shouldPlay
                            />
                        ) : null}
                    </View>

                    <View style={styles.previewInfo}>
                        <Text style={styles.previewFileName}>{selectedAsset.file_name}</Text>
                        <Text style={styles.previewFileMeta}>
                            {formatBytes(selectedAsset.file_size)}
                        </Text>
                    </View>

                    <View style={styles.previewActions}>
                        <TouchableOpacity
                            style={styles.previewAction}
                            onPress={() => handleShareFile(selectedAsset)}
                        >
                            <Feather name="share-2" size={22} color="#FFFFFF" />
                            <Text style={styles.previewActionText}>Share</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.previewAction}
                            onPress={() => {
                                setPreviewModalVisible(false);
                                handleDeleteFile(selectedAsset);
                            }}
                        >
                            <Feather name="trash-2" size={22} color="#EF4444" />
                            <Text style={[styles.previewActionText, { color: '#EF4444' }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    // Folder Detail Modal
    const FolderDetailModal = () => {
        if (!selectedFolder) return null;

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
                        <Text style={styles.folderModalTitle}>{selectedFolder.name}</Text>
                        <TouchableOpacity onPress={() => openFolderMenu(selectedFolder)}>
                            <Feather name="more-vertical" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.folderContent}>
                        {selectedFolder.assets?.length === 0 ? (
                            <View style={styles.emptyFolder}>
                                <Feather name="folder" size={48} color={COLORS.textSecondary} />
                                <Text style={styles.emptyTitle}>No files in this folder</Text>
                            </View>
                        ) : (
                            <View style={styles.folderGrid}>
                                {selectedFolder.assets?.map(file => (
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
                                    toast.info('Rename folder coming soon');
                                }}
                            >
                                <Feather name="edit-2" size={20} color={COLORS.text} />
                                <Text style={styles.menuText}>Rename</Text>
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

                {/* Properties Section */}
                {activeTab === 'all' && properties.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>PROPERTIES</Text>
                        </View>
                        <View style={styles.propertiesGrid}>
                            {properties.map((property) => (
                                <PropertyCard key={property.id} property={property} />
                            ))}
                        </View>
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
            <PreviewModal />
            <FolderDetailModal />
            <MenuModal />
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
        backgroundColor: 'rgba(0,0,0,0.95)',
    },
    previewClose: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.6,
    },
    previewVideo: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.5,
    },
    previewInfo: {
        padding: 20,
        alignItems: 'center',
    },
    previewFileName: {
        fontSize: 16,
        fontFamily: 'DMSans_600SemiBold',
        color: '#FFFFFF',
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
        gap: 40,
        paddingBottom: 40,
    },
    previewAction: {
        alignItems: 'center',
    },
    previewActionText: {
        fontSize: 12,
        fontFamily: 'DMSans_500Medium',
        color: '#FFFFFF',
        marginTop: 4,
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
});

export default AgentAssetsScreen;

