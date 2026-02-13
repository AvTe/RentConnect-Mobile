import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_STORAGE_KEY = '@app_language';

// Translation strings for all supported languages
const translations = {
    en: {
        // Common
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flag: '🇬🇧',

        // Navigation
        home: 'Home',
        dashboard: 'Dashboard',
        properties: 'Properties',
        assets: 'Assets',
        rewards: 'Rewards',
        account: 'Account',
        settings: 'Settings',
        notifications: 'Notifications',

        // Auth
        login: 'Login',
        signUp: 'Sign Up',
        signOut: 'Sign Out',
        email: 'Email',
        password: 'Password',
        forgotPassword: 'Forgot Password?',

        // Settings
        appearance: 'Appearance',
        language: 'Language',
        lightMode: 'Light Mode',
        darkMode: 'Dark Mode',
        systemDefault: 'System Default',
        selectTheme: 'Select Theme',
        selectLanguage: 'Select Language',
        accountSettings: 'Account Settings',
        pushNotifications: 'Push Notifications',
        emailNotifications: 'Email Notifications',
        passwordSecurity: 'Password & Security',
        privacySettings: 'Privacy Settings',
        about: 'About',
        termsOfService: 'Terms of Service',
        privacyPolicy: 'Privacy Policy',
        helpSupport: 'Help & Support',

        // Profile
        profile: 'Profile',
        editProfile: 'Edit Profile',
        personalInfo: 'Personal Information',
        agencyProfile: 'Agency Profile',

        // Leads
        leads: 'Leads',
        newLeads: 'New Leads',
        unlocked: 'Unlocked',
        available: 'Available',

        // Common actions
        save: 'Save',
        cancel: 'Cancel',
        confirm: 'Confirm',
        delete: 'Delete',
        edit: 'Edit',
        view: 'View',
        share: 'Share',
        search: 'Search',
        filter: 'Filter',
        refresh: 'Refresh',
        loading: 'Loading...',

        // Messages
        success: 'Success',
        error: 'Error',
        welcome: 'Welcome',
        goodbye: 'Goodbye',
    },
    sw: {
        code: 'sw',
        name: 'Swahili',
        nativeName: 'Kiswahili',
        flag: '🇰🇪',

        home: 'Nyumbani',
        dashboard: 'Dashibodi',
        properties: 'Mali',
        assets: 'Rasilimali',
        rewards: 'Zawadi',
        account: 'Akaunti',
        settings: 'Mipangilio',
        notifications: 'Arifa',

        login: 'Ingia',
        signUp: 'Jiandikishe',
        signOut: 'Ondoka',
        email: 'Barua pepe',
        password: 'Nenosiri',
        forgotPassword: 'Umesahau nenosiri?',

        appearance: 'Mwonekano',
        language: 'Lugha',
        lightMode: 'Hali ya Mwanga',
        darkMode: 'Hali ya Giza',
        systemDefault: 'Mfumo chaguomsingi',
        selectTheme: 'Chagua Mandhari',
        selectLanguage: 'Chagua Lugha',
        accountSettings: 'Mipangilio ya Akaunti',
        pushNotifications: 'Arifa za Push',
        emailNotifications: 'Arifa za Barua pepe',
        passwordSecurity: 'Nenosiri na Usalama',
        privacySettings: 'Mipangilio ya Faragha',
        about: 'Kuhusu',
        termsOfService: 'Masharti ya Huduma',
        privacyPolicy: 'Sera ya Faragha',
        helpSupport: 'Msaada na Usaidizi',

        profile: 'Wasifu',
        editProfile: 'Hariri Wasifu',
        personalInfo: 'Taarifa Binafsi',
        agencyProfile: 'Wasifu wa Wakala',

        leads: 'Viongozi',
        newLeads: 'Viongozi Wapya',
        unlocked: 'Imefunguliwa',
        available: 'Inapatikana',

        save: 'Hifadhi',
        cancel: 'Ghairi',
        confirm: 'Thibitisha',
        delete: 'Futa',
        edit: 'Hariri',
        view: 'Tazama',
        share: 'Shiriki',
        search: 'Tafuta',
        filter: 'Chuja',
        refresh: 'Sasisha',
        loading: 'Inapakia...',

        success: 'Imefanikiwa',
        error: 'Kosa',
        welcome: 'Karibu',
        goodbye: 'Kwaheri',
    },
    ar: {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        flag: '🇸🇦',

        home: 'الرئيسية',
        dashboard: 'لوحة التحكم',
        properties: 'العقارات',
        assets: 'الأصول',
        rewards: 'المكافآت',
        account: 'الحساب',
        settings: 'الإعدادات',
        notifications: 'الإشعارات',

        login: 'تسجيل الدخول',
        signUp: 'إنشاء حساب',
        signOut: 'تسجيل الخروج',
        email: 'البريد الإلكتروني',
        password: 'كلمة المرور',
        forgotPassword: 'نسيت كلمة المرور؟',

        appearance: 'المظهر',
        language: 'اللغة',
        lightMode: 'الوضع الفاتح',
        darkMode: 'الوضع الداكن',
        systemDefault: 'إعداد النظام',
        selectTheme: 'اختر المظهر',
        selectLanguage: 'اختر اللغة',
        accountSettings: 'إعدادات الحساب',
        pushNotifications: 'إشعارات الدفع',
        emailNotifications: 'إشعارات البريد',
        passwordSecurity: 'كلمة المرور والأمان',
        privacySettings: 'إعدادات الخصوصية',
        about: 'حول',
        termsOfService: 'شروط الخدمة',
        privacyPolicy: 'سياسة الخصوصية',
        helpSupport: 'المساعدة والدعم',

        profile: 'الملف الشخصي',
        editProfile: 'تعديل الملف',
        personalInfo: 'المعلومات الشخصية',
        agencyProfile: 'ملف الوكالة',

        leads: 'العملاء المحتملون',
        newLeads: 'عملاء جدد',
        unlocked: 'مفتوح',
        available: 'متاح',

        save: 'حفظ',
        cancel: 'إلغاء',
        confirm: 'تأكيد',
        delete: 'حذف',
        edit: 'تعديل',
        view: 'عرض',
        share: 'مشاركة',
        search: 'بحث',
        filter: 'تصفية',
        refresh: 'تحديث',
        loading: 'جاري التحميل...',

        success: 'نجاح',
        error: 'خطأ',
        welcome: 'أهلاً',
        goodbye: 'مع السلامة',
    },
    fr: {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        flag: '🇫🇷',

        home: 'Accueil',
        dashboard: 'Tableau de bord',
        properties: 'Propriétés',
        assets: 'Actifs',
        rewards: 'Récompenses',
        account: 'Compte',
        settings: 'Paramètres',
        notifications: 'Notifications',

        login: 'Connexion',
        signUp: "S'inscrire",
        signOut: 'Déconnexion',
        email: 'E-mail',
        password: 'Mot de passe',
        forgotPassword: 'Mot de passe oublié?',

        appearance: 'Apparence',
        language: 'Langue',
        lightMode: 'Mode clair',
        darkMode: 'Mode sombre',
        systemDefault: 'Par défaut du système',
        selectTheme: 'Sélectionner le thème',
        selectLanguage: 'Sélectionner la langue',
        accountSettings: 'Paramètres du compte',
        pushNotifications: 'Notifications push',
        emailNotifications: 'Notifications par e-mail',
        passwordSecurity: 'Mot de passe et sécurité',
        privacySettings: 'Paramètres de confidentialité',
        about: 'À propos',
        termsOfService: "Conditions d'utilisation",
        privacyPolicy: 'Politique de confidentialité',
        helpSupport: 'Aide et support',

        profile: 'Profil',
        editProfile: 'Modifier le profil',
        personalInfo: 'Informations personnelles',
        agencyProfile: "Profil de l'agence",

        leads: 'Prospects',
        newLeads: 'Nouveaux prospects',
        unlocked: 'Débloqué',
        available: 'Disponible',

        save: 'Enregistrer',
        cancel: 'Annuler',
        confirm: 'Confirmer',
        delete: 'Supprimer',
        edit: 'Modifier',
        view: 'Voir',
        share: 'Partager',
        search: 'Rechercher',
        filter: 'Filtrer',
        refresh: 'Actualiser',
        loading: 'Chargement...',

        success: 'Succès',
        error: 'Erreur',
        welcome: 'Bienvenue',
        goodbye: 'Au revoir',
    },
    ha: {
        code: 'ha',
        name: 'Hausa',
        nativeName: 'Hausa',
        flag: '🇳🇬',

        home: 'Gida',
        dashboard: 'Dashboard',
        properties: 'Kaddarori',
        assets: 'Dukiya',
        rewards: 'Lada',
        account: 'Asusu',
        settings: 'Saitunan',
        notifications: 'Sanarwa',

        login: 'Shiga',
        signUp: 'Yi Rajista',
        signOut: 'Fita',
        email: 'Imel',
        password: 'Kalmar sirri',
        forgotPassword: 'Manta kalmar sirri?',

        appearance: 'Bayyanar',
        language: 'Harshe',
        lightMode: 'Yanayin Haske',
        darkMode: 'Yanayin Duhu',
        systemDefault: 'Tsarin Na Asali',
        selectTheme: 'Zaɓi Jigo',
        selectLanguage: 'Zaɓi Harshe',
        accountSettings: 'Saitunan Asusu',
        pushNotifications: 'Sanarwar Push',
        emailNotifications: 'Sanarwar Imel',
        passwordSecurity: 'Kalma da Tsaro',
        privacySettings: 'Saitunan Sirri',
        about: 'Game da',
        termsOfService: 'Sharuddan Sabis',
        privacyPolicy: 'Manufar Sirri',
        helpSupport: 'Taimako da Tallafi',

        profile: 'Bayanan Kai',
        editProfile: 'Gyara Bayanan',
        personalInfo: 'Bayanan Mutum',
        agencyProfile: 'Bayanan Hukuma',

        leads: 'Abokan Ciniki',
        newLeads: 'Sababbin Abokan',
        unlocked: 'An Buɗe',
        available: 'Akwai',

        save: 'Ajiye',
        cancel: 'Soke',
        confirm: 'Tabbatar',
        delete: 'Share',
        edit: 'Gyara',
        view: 'Duba',
        share: 'Raba',
        search: 'Bincika',
        filter: 'Tace',
        refresh: 'Sabunta',
        loading: 'Ana Lodawa...',

        success: 'Nasara',
        error: 'Kuskure',
        welcome: 'Barka da zuwa',
        goodbye: 'Sai anjima',
    },
    am: {
        code: 'am',
        name: 'Amharic',
        nativeName: 'አማርኛ',
        flag: '🇪🇹',

        home: 'ቤት',
        dashboard: 'ዳሽቦርድ',
        properties: 'ንብረቶች',
        assets: 'ንብረቶች',
        rewards: 'ሽልማቶች',
        account: 'መለያ',
        settings: 'ቅንብሮች',
        notifications: 'ማሳወቂያዎች',

        login: 'ግባ',
        signUp: 'ተመዝገብ',
        signOut: 'ውጣ',
        email: 'ኢሜይል',
        password: 'የይለፍ ቃል',
        forgotPassword: 'የይለፍ ቃል ረሳህ?',

        appearance: 'መልክ',
        language: 'ቋንቋ',
        lightMode: 'ብርሃን ሁነታ',
        darkMode: 'ጨለማ ሁነታ',
        systemDefault: 'የስርዓት ነባሪ',
        selectTheme: 'ገጽታ ይምረጡ',
        selectLanguage: 'ቋንቋ ይምረጡ',
        accountSettings: 'የመለያ ቅንብሮች',
        pushNotifications: 'የግፋ ማሳወቂያዎች',
        emailNotifications: 'የኢሜይል ማሳወቂያዎች',
        passwordSecurity: 'የይለፍ ቃል እና ደህንነት',
        privacySettings: 'የግላዊነት ቅንብሮች',
        about: 'ስለ',
        termsOfService: 'የአገልግሎት ውሎች',
        privacyPolicy: 'የግላዊነት ፖሊሲ',
        helpSupport: 'እገዛ እና ድጋፍ',

        profile: 'መገለጫ',
        editProfile: 'መገለጫ አርትዕ',
        personalInfo: 'የግል መረጃ',
        agencyProfile: 'የወኪል መገለጫ',

        leads: 'ደንበኞች',
        newLeads: 'አዲስ ደንበኞች',
        unlocked: 'ተከፍቷል',
        available: 'ይገኛል',

        save: 'አስቀምጥ',
        cancel: 'ሰርዝ',
        confirm: 'አረጋግጥ',
        delete: 'ሰርዝ',
        edit: 'አርትዕ',
        view: 'ተመልከት',
        share: 'አጋራ',
        search: 'ፈልግ',
        filter: 'አጣራ',
        refresh: 'አድስ',
        loading: 'በመጫን ላይ...',

        success: 'ተሳካ',
        error: 'ስህተት',
        welcome: 'እንኳን ደህና መጣህ',
        goodbye: 'ደህና ሁን',
    },
    pt: {
        code: 'pt',
        name: 'Portuguese',
        nativeName: 'Português',
        flag: '🇵🇹',

        home: 'Início',
        dashboard: 'Painel',
        properties: 'Propriedades',
        assets: 'Ativos',
        rewards: 'Recompensas',
        account: 'Conta',
        settings: 'Configurações',
        notifications: 'Notificações',

        login: 'Entrar',
        signUp: 'Cadastrar',
        signOut: 'Sair',
        email: 'E-mail',
        password: 'Senha',
        forgotPassword: 'Esqueceu a senha?',

        appearance: 'Aparência',
        language: 'Idioma',
        lightMode: 'Modo Claro',
        darkMode: 'Modo Escuro',
        systemDefault: 'Padrão do Sistema',
        selectTheme: 'Selecionar Tema',
        selectLanguage: 'Selecionar Idioma',
        accountSettings: 'Configurações da Conta',
        pushNotifications: 'Notificações Push',
        emailNotifications: 'Notificações por E-mail',
        passwordSecurity: 'Senha e Segurança',
        privacySettings: 'Configurações de Privacidade',
        about: 'Sobre',
        termsOfService: 'Termos de Serviço',
        privacyPolicy: 'Política de Privacidade',
        helpSupport: 'Ajuda e Suporte',

        profile: 'Perfil',
        editProfile: 'Editar Perfil',
        personalInfo: 'Informações Pessoais',
        agencyProfile: 'Perfil da Agência',

        leads: 'Leads',
        newLeads: 'Novos Leads',
        unlocked: 'Desbloqueado',
        available: 'Disponível',

        save: 'Salvar',
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        delete: 'Excluir',
        edit: 'Editar',
        view: 'Ver',
        share: 'Compartilhar',
        search: 'Pesquisar',
        filter: 'Filtrar',
        refresh: 'Atualizar',
        loading: 'Carregando...',

        success: 'Sucesso',
        error: 'Erro',
        welcome: 'Bem-vindo',
        goodbye: 'Adeus',
    },
    es: {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        flag: '🇪🇸',

        home: 'Inicio',
        dashboard: 'Panel',
        properties: 'Propiedades',
        assets: 'Activos',
        rewards: 'Recompensas',
        account: 'Cuenta',
        settings: 'Configuración',
        notifications: 'Notificaciones',

        login: 'Iniciar sesión',
        signUp: 'Registrarse',
        signOut: 'Cerrar sesión',
        email: 'Correo electrónico',
        password: 'Contraseña',
        forgotPassword: '¿Olvidaste la contraseña?',

        appearance: 'Apariencia',
        language: 'Idioma',
        lightMode: 'Modo Claro',
        darkMode: 'Modo Oscuro',
        systemDefault: 'Predeterminado del Sistema',
        selectTheme: 'Seleccionar Tema',
        selectLanguage: 'Seleccionar Idioma',
        accountSettings: 'Configuración de Cuenta',
        pushNotifications: 'Notificaciones Push',
        emailNotifications: 'Notificaciones por Correo',
        passwordSecurity: 'Contraseña y Seguridad',
        privacySettings: 'Configuración de Privacidad',
        about: 'Acerca de',
        termsOfService: 'Términos de Servicio',
        privacyPolicy: 'Política de Privacidad',
        helpSupport: 'Ayuda y Soporte',

        profile: 'Perfil',
        editProfile: 'Editar Perfil',
        personalInfo: 'Información Personal',
        agencyProfile: 'Perfil de Agencia',

        leads: 'Prospectos',
        newLeads: 'Nuevos Prospectos',
        unlocked: 'Desbloqueado',
        available: 'Disponible',

        save: 'Guardar',
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        delete: 'Eliminar',
        edit: 'Editar',
        view: 'Ver',
        share: 'Compartir',
        search: 'Buscar',
        filter: 'Filtrar',
        refresh: 'Actualizar',
        loading: 'Cargando...',

        success: 'Éxito',
        error: 'Error',
        welcome: 'Bienvenido',
        goodbye: 'Adiós',
    },
    zh: {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        flag: '🇨🇳',

        home: '首页',
        dashboard: '仪表板',
        properties: '房产',
        assets: '资产',
        rewards: '奖励',
        account: '账户',
        settings: '设置',
        notifications: '通知',

        login: '登录',
        signUp: '注册',
        signOut: '退出',
        email: '邮箱',
        password: '密码',
        forgotPassword: '忘记密码？',

        appearance: '外观',
        language: '语言',
        lightMode: '浅色模式',
        darkMode: '深色模式',
        systemDefault: '跟随系统',
        selectTheme: '选择主题',
        selectLanguage: '选择语言',
        accountSettings: '账户设置',
        pushNotifications: '推送通知',
        emailNotifications: '邮件通知',
        passwordSecurity: '密码与安全',
        privacySettings: '隐私设置',
        about: '关于',
        termsOfService: '服务条款',
        privacyPolicy: '隐私政策',
        helpSupport: '帮助与支持',

        profile: '个人资料',
        editProfile: '编辑资料',
        personalInfo: '个人信息',
        agencyProfile: '机构资料',

        leads: '潜在客户',
        newLeads: '新客户',
        unlocked: '已解锁',
        available: '可用',

        save: '保存',
        cancel: '取消',
        confirm: '确认',
        delete: '删除',
        edit: '编辑',
        view: '查看',
        share: '分享',
        search: '搜索',
        filter: '筛选',
        refresh: '刷新',
        loading: '加载中...',

        success: '成功',
        error: '错误',
        welcome: '欢迎',
        goodbye: '再见',
    },
    hi: {
        code: 'hi',
        name: 'Hindi',
        nativeName: 'हिन्दी',
        flag: '🇮🇳',

        home: 'होम',
        dashboard: 'डैशबोर्ड',
        properties: 'संपत्तियाँ',
        assets: 'संसाधन',
        rewards: 'पुरस्कार',
        account: 'खाता',
        settings: 'सेटिंग्स',
        notifications: 'सूचनाएं',

        login: 'लॉग इन',
        signUp: 'साइन अप',
        signOut: 'साइन आउट',
        email: 'ईमेल',
        password: 'पासवर्ड',
        forgotPassword: 'पासवर्ड भूल गए?',

        appearance: 'दिखावट',
        language: 'भाषा',
        lightMode: 'लाइट मोड',
        darkMode: 'डार्क मोड',
        systemDefault: 'सिस्टम डिफ़ॉल्ट',
        selectTheme: 'थीम चुनें',
        selectLanguage: 'भाषा चुनें',
        accountSettings: 'खाता सेटिंग्स',
        pushNotifications: 'पुश नोटिफिकेशन',
        emailNotifications: 'ईमेल नोटिफिकेशन',
        passwordSecurity: 'पासवर्ड और सुरक्षा',
        privacySettings: 'गोपनीयता सेटिंग्स',
        about: 'के बारे में',
        termsOfService: 'सेवा की शर्तें',
        privacyPolicy: 'गोपनीयता नीति',
        helpSupport: 'सहायता और समर्थन',

        profile: 'प्रोफ़ाइल',
        editProfile: 'प्रोफ़ाइल संपादित करें',
        personalInfo: 'व्यक्तिगत जानकारी',
        agencyProfile: 'एजेंसी प्रोफ़ाइल',

        leads: 'लीड्स',
        newLeads: 'नए लीड्स',
        unlocked: 'अनलॉक',
        available: 'उपलब्ध',

        save: 'सहेजें',
        cancel: 'रद्द करें',
        confirm: 'पुष्टि करें',
        delete: 'हटाएं',
        edit: 'संपादित करें',
        view: 'देखें',
        share: 'साझा करें',
        search: 'खोजें',
        filter: 'फ़िल्टर',
        refresh: 'रीफ्रेश',
        loading: 'लोड हो रहा है...',

        success: 'सफल',
        error: 'त्रुटि',
        welcome: 'स्वागत है',
        goodbye: 'अलविदा',
    },
};

// Available languages list
const availableLanguages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', region: 'Global' },
    { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪', region: 'Africa' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', region: 'Middle East' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', region: 'Global' },
    { code: 'ha', name: 'Hausa', nativeName: 'Hausa', flag: '🇳🇬', region: 'Africa' },
    { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹', region: 'Africa' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', region: 'Global' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', region: 'Global' },
    { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', region: 'Asia' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', region: 'Asia' },
];

const LanguageContext = createContext();

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export const LanguageProvider = ({ children }) => {
    const [currentLanguage, setCurrentLanguage] = useState('en');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        loadLanguage();
    }, []);

    const loadLanguage = async () => {
        try {
            const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
            if (savedLanguage && translations[savedLanguage]) {
                setCurrentLanguage(savedLanguage);
            }
        } catch (error) {
            console.error('Error loading language:', error);
        } finally {
            setIsLoaded(true);
        }
    };

    const changeLanguage = async (langCode) => {
        try {
            if (translations[langCode]) {
                await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, langCode);
                setCurrentLanguage(langCode);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error saving language:', error);
            return false;
        }
    };

    // Translation function
    const t = (key) => {
        return translations[currentLanguage]?.[key] || translations.en[key] || key;
    };

    const value = {
        language: currentLanguage,
        setLanguage: changeLanguage,
        t,
        translations: translations[currentLanguage] || translations.en,
        availableLanguages,
        isLoaded,
        isRTL: currentLanguage === 'ar', // Right-to-left for Arabic
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export { translations, availableLanguages };
export default LanguageContext;
