import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { FONTS } from '../../constants/theme';

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
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // grid or list

    // Data states
    const [storageUsage, setStorageUsage] = useState({
        totalUsed: 0,
        limit: 50 * 1024 * 1024, // 50 MB default
        imageCount: 0,
        videoCount: 0,
        documentCount: 0,
    });
    const [folders, setFolders] = useState([]);
    const [recentFiles, setRecentFiles] = useState([]);

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getStoragePercentage = () => {
        return (storageUsage.totalUsed / storageUsage.limit) * 100;
    };

    const fetchAssets = useCallback(async () => {
        if (!user?.id) return;

        try {
            // Fetch folders
            const { data: foldersData, error: foldersError } = await supabase
                .from('agent_folders')
                .select('*')
                .eq('agent_id', user.id)
                .order('created_at', { ascending: false });

            if (foldersError) throw foldersError;

            // Fetch assets
            const { data: assetsData, error: assetsError } = await supabase
                .from('agent_assets')
                .select('*')
                .eq('agent_id', user.id)
                .order('created_at', { ascending: false });

            if (assetsError) throw assetsError;

            // Calculate storage usage
            const assets = assetsData || [];
            const totalUsed = assets.reduce((sum, asset) => sum + (asset.file_size || 0), 0);
            const imageCount = assets.filter(a => a.file_type?.startsWith('image')).length;
            const videoCount = assets.filter(a => a.file_type?.startsWith('video')).length;
            const documentCount = assets.filter(a =>
                !a.file_type?.startsWith('image') && !a.file_type?.startsWith('video')
            ).length;

            setStorageUsage({
                ...storageUsage,
                totalUsed,
                imageCount,
                videoCount,
                documentCount,
            });

            // Map folders with asset counts
            const foldersWithCounts = (foldersData || []).map(folder => ({
                ...folder,
                assetCount: assets.filter(a => a.folder_id === folder.id).length,
            }));

            setFolders(foldersWithCounts);
            setRecentFiles(assets.slice(0, 5));
        } catch (error) {
            console.error('Error fetching assets:', error);
            // Use demo data on error
            setFolders([
                { id: '1', name: 'Meru Luxury...', location: 'Meru', assetCount: 1 },
                { id: '2', name: 'Nairobi...', location: 'Nairobi', assetCount: 3 },
                { id: '3', name: 'Westlands Office', location: 'Nairobi', assetCount: 12 },
            ]);
            setRecentFiles([
                { id: '1', file_name: 'Living_Room_View_01.jpg', folder_name: 'Meru Luxury Houses', file_size: 2.4 * 1024 * 1024, file_type: 'image/jpeg' },
                { id: '2', file_name: 'Lease_Agreement_Draft.pdf', folder_name: 'Nairobi Apartments', file_size: 1.1 * 1024 * 1024, file_type: 'application/pdf' },
            ]);
            setStorageUsage({
                totalUsed: 9.73 * 1024 * 1024,
                limit: 50 * 1024 * 1024,
                imageCount: 4,
                videoCount: 1,
                documentCount: 1,
            });
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

    const handleUpload = async () => {
        Alert.alert(
            'Upload File',
            'Choose file type to upload',
            [
                {
                    text: 'Photo',
                    onPress: async () => {
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: true,
                            quality: 0.8,
                        });
                        if (!result.canceled) {
                            toast.success('Photo selected! Upload coming soon.');
                        }
                    },
                },
                {
                    text: 'Document',
                    onPress: async () => {
                        const result = await DocumentPicker.getDocumentAsync({
                            type: '*/*',
                        });
                        if (result.type !== 'cancel') {
                            toast.success('Document selected! Upload coming soon.');
                        }
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleCreateFolder = () => {
        Alert.prompt(
            'Create Property Folder',
            'Enter property name',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Create',
                    onPress: (name) => {
                        if (name) {
                            toast.success(`Folder "${name}" created!`);
                        }
                    },
                },
            ],
            'plain-text'
        );
    };

    const getFileIcon = (fileType) => {
        if (fileType?.startsWith('image')) return 'image';
        if (fileType?.startsWith('video')) return 'video';
        if (fileType?.includes('pdf')) return 'file-text';
        return 'file';
    };

    const getFileIconBg = (fileType) => {
        if (fileType?.startsWith('image')) return COLORS.blueLight;
        if (fileType?.startsWith('video')) return COLORS.purpleLight;
        if (fileType?.includes('pdf')) return COLORS.primaryLight;
        return COLORS.background;
    };

    const getFileIconColor = (fileType) => {
        if (fileType?.startsWith('image')) return COLORS.blue;
        if (fileType?.startsWith('video')) return COLORS.purple;
        if (fileType?.includes('pdf')) return COLORS.primary;
        return COLORS.textSecondary;
    };

    const filteredFolders = folders.filter(folder =>
        folder.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Property Folder Card
    const FolderCard = ({ folder }) => (
        <TouchableOpacity
            style={styles.folderCard}
            onPress={() => toast.info(`Opening ${folder.name}`)}
            activeOpacity={0.8}
        >
            <View style={styles.folderIconContainer}>
                <Feather name="folder" size={40} color={COLORS.primary} />
            </View>
            <View style={styles.folderInfo}>
                <View style={styles.folderHeader}>
                    <Text style={styles.folderName} numberOfLines={1}>{folder.name}</Text>
                    <TouchableOpacity>
                        <Feather name="more-vertical" size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>
                <View style={styles.folderMeta}>
                    <Feather name="map-pin" size={12} color={COLORS.textSecondary} />
                    <Text style={styles.folderLocation}>{folder.location}</Text>
                </View>
                <Text style={styles.folderFileCount}>{folder.assetCount || 0} file{folder.assetCount !== 1 ? 's' : ''}</Text>
            </View>
        </TouchableOpacity>
    );

    // Recent File Item
    const FileItem = ({ file }) => (
        <TouchableOpacity
            style={styles.fileItem}
            onPress={() => toast.info(`Opening ${file.file_name}`)}
            activeOpacity={0.8}
        >
            <View style={[styles.fileIcon, { backgroundColor: getFileIconBg(file.file_type) }]}>
                <Feather name={getFileIcon(file.file_type)} size={20} color={getFileIconColor(file.file_type)} />
            </View>
            <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>{file.file_name}</Text>
                <Text style={styles.fileMeta}>
                    {file.folder_name} • {formatBytes(file.file_size)}
                </Text>
            </View>
            <TouchableOpacity>
                <Feather name="more-vertical" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
        </TouchableOpacity>
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
                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => navigation.goBack()}
                >
                    <Feather name="menu" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Assets</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerIconBtn}>
                        <Feather name="bell" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.avatarButton}>
                        <Text style={styles.avatarText}>
                            {userData?.name?.charAt(0).toUpperCase() || 'A'}
                        </Text>
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
                            <Text style={styles.storageSubtitle}>Manage your files</Text>
                        </View>
                        <TouchableOpacity>
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

                {/* Search Bar */}
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
                        <Feather
                            name={viewMode === 'grid' ? 'grid' : 'list'}
                            size={20}
                            color={COLORS.textSecondary}
                        />
                    </TouchableOpacity>
                </View>

                {/* Properties Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>PROPERTIES</Text>
                    <TouchableOpacity>
                        <Text style={styles.viewAllText}>View All</Text>
                    </TouchableOpacity>
                </View>

                {filteredFolders.length === 0 ? (
                    <View style={styles.emptyFolders}>
                        <Feather name="folder-plus" size={48} color={COLORS.textSecondary} />
                        <Text style={styles.emptyTitle}>No property folders</Text>
                        <TouchableOpacity
                            style={styles.createFolderBtn}
                            onPress={handleCreateFolder}
                        >
                            <Text style={styles.createFolderText}>Create Folder</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.foldersGrid}>
                        {filteredFolders.map((folder) => (
                            <FolderCard key={folder.id} folder={folder} />
                        ))}
                    </View>
                )}

                {/* Recent Files Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>RECENT FILES</Text>
                </View>

                {recentFiles.length === 0 ? (
                    <View style={styles.emptyFiles}>
                        <Feather name="file" size={48} color={COLORS.textSecondary} />
                        <Text style={styles.emptyTitle}>No files yet</Text>
                        <Text style={styles.emptyText}>Upload files to see them here</Text>
                    </View>
                ) : (
                    <View style={styles.filesList}>
                        {recentFiles.map((file) => (
                            <FileItem key={file.id} file={file} />
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
            >
                <Feather name="plus" size={28} color="#FFFFFF" />
            </TouchableOpacity>
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
        fontFamily: FONTS.medium,
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
        fontFamily: FONTS.bold,
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
    avatarButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    avatarText: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
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
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    storageSubtitle: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    upgradeText: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        color: COLORS.primary,
    },
    storageUsageRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    storageUsed: {
        fontSize: 28,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    storageLimit: {
        fontSize: 14,
        fontFamily: FONTS.regular,
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
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    fileTypeLabel: {
        fontSize: 10,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
    },
    // Search
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
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
        fontFamily: FONTS.regular,
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
    // Sections
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: FONTS.bold,
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
    },
    viewAllText: {
        fontSize: 13,
        fontFamily: FONTS.semiBold,
        color: COLORS.primary,
    },
    // Folders Grid
    foldersGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
        marginBottom: 24,
    },
    folderCard: {
        width: '50%',
        paddingHorizontal: 6,
        marginBottom: 12,
    },
    folderIconContainer: {
        backgroundColor: COLORS.primaryLight,
        borderRadius: 12,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    folderInfo: {
        paddingHorizontal: 4,
    },
    folderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    folderName: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
        flex: 1,
    },
    folderMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    folderLocation: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
    },
    folderFileCount: {
        fontSize: 11,
        fontFamily: FONTS.medium,
        color: COLORS.primary,
        marginTop: 2,
    },
    // Empty States
    emptyFolders: {
        alignItems: 'center',
        paddingVertical: 40,
        marginBottom: 24,
    },
    emptyFiles: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyTitle: {
        fontSize: 16,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
        marginTop: 12,
    },
    emptyText: {
        fontSize: 13,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    createFolderBtn: {
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: COLORS.primary,
        borderRadius: 10,
    },
    createFolderText: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        color: '#FFFFFF',
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
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    fileMeta: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: 2,
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
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
});

export default AgentAssetsScreen;
