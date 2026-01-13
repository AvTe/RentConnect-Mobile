# RentConnect Mobile

React Native mobile application for RentConnect - Kenya's rental property platform.

## Overview

This is the mobile companion app for RentConnect, built with Expo and React Native. It shares the same Supabase backend as the web application, allowing users to seamlessly access their accounts across platforms.

## Tech Stack

- **Framework**: Expo (React Native)
- **Navigation**: React Navigation
- **Backend**: Supabase (shared with web app)
- **Auth Storage**: AsyncStorage + SecureStore

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- Expo Go app on your phone (for testing)

### Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npx expo start
   ```

3. Scan the QR code with Expo Go (Android) or Camera app (iOS)

## Project Structure

```
src/
  context/        # React contexts (Auth, etc.)
  lib/            # Utilities and Supabase client
  navigation/     # Navigation configuration
  screens/        # Screen components
  components/     # Reusable UI components
  assets/         # Images and other assets
```

## Features

- [x] User Authentication (Login/Signup)
- [x] Password Reset
- [x] Shared Supabase Backend
- [ ] Property Listings
- [ ] Lead Management
- [ ] Agent Dashboard
- [ ] Tenant Dashboard
- [ ] Push Notifications

## Related

- [RentConnect Web](https://github.com/AvTe/RentConnect) - Next.js web application
