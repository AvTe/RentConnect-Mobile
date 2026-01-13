# RentConnect Mobile App - Developer Onboarding Guide

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- React Native CLI or Expo CLI
- Android Studio (for Android) / Xcode (for iOS)
- Git

### Setup
```bash
cd RentConnect-Mobile
npm install
npx expo start        # For Expo
# OR
npx react-native run-android   # For bare React Native
npx react-native run-ios
```

---

## Project Structure

```
RentConnect-Mobile/
├── src/
│   ├── components/          # Reusable UI components
│   ├── context/
│   │   └── AuthContext.js   # Authentication state management
│   ├── navigation/
│   │   └── AppNavigator.js  # React Navigation setup
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   ├── SignUpScreen.js
│   │   ├── ForgotPasswordScreen.js
│   │   └── HomeScreen.js
│   ├── services/
│   │   └── api.js           # API client for backend
│   └── utils/               # Helper functions
├── App.js                   # Entry point
└── package.json
```

---

## Architecture Overview

### Authentication Flow
```
App.js
  └── AuthProvider (Context)
        └── AppNavigator
              ├── AuthStack (if !user)
              │     ├── LoginScreen
              │     ├── SignUpScreen
              │     └── ForgotPasswordScreen
              └── MainStack (if user)
                    └── HomeScreen
```

### Key Patterns

1. **Context API** - Global state via `AuthContext`
2. **Stack Navigation** - `@react-navigation/native-stack`
3. **Conditional Rendering** - Auth state determines which stack renders

---

## Design System

### Colors
| Name    | Hex       | Usage                    |
|---------|-----------|--------------------------|
| Primary | `#FE9200` | Buttons, links, accents  |
| Text    | `#1F2937` | Primary text             |
| Gray    | `#6B7280` | Secondary text           |
| Border  | `#E5E7EB` | Input borders            |
| BG      | `#F9FAFB` | Input backgrounds        |

### Component Standards
- Border radius: `12px`
- Button padding: `18px`
- Input padding: `16px`
- Font sizes: 14 (label), 16 (body), 18 (button), 28 (title)

---

## API Integration

Backend URL: `http://localhost:3001/api` (development)

### Endpoints
| Method | Endpoint              | Description        |
|--------|-----------------------|--------------------|
| POST   | `/auth/login`         | User login         |
| POST   | `/auth/register`      | User registration  |
| POST   | `/auth/forgot-password` | Password reset   |
| GET    | `/properties`         | List properties    |
| GET    | `/properties/:id`     | Property details   |

---

## Common Tasks

### Adding a New Screen
1. Create `src/screens/NewScreen.js`
2. Add to navigator in `AppNavigator.js`
3. Navigate: `navigation.navigate('NewScreen')`

### Using Auth Context
```javascript
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
  const { user, signIn, signOut } = useAuth();
  // ...
};
```

### Making API Calls
```javascript
import api from '../services/api';

const fetchData = async () => {
  try {
    const response = await api.get('/endpoint');
    return response.data;
  } catch (error) {
    console.error(error);
  }
};
```

---

## Testing

```bash
npm test              # Run Jest tests
npm run test:watch    # Watch mode
```

---

## Troubleshooting

| Issue                     | Solution                              |
|---------------------------|---------------------------------------|
| Metro bundler crash       | `npx react-native start --reset-cache`|
| Android build fails       | Check `ANDROID_HOME` env variable     |
| iOS pod issues            | `cd ios && pod install --repo-update` |
| Auth state not persisting | Check AsyncStorage implementation     |

---

## Next Steps for Development

- [ ] Property listing screen with FlatList
- [ ] Property detail screen
- [ ] Favorites functionality
- [ ] User profile screen
- [ ] Push notifications
- [ ] Offline support with AsyncStorage

