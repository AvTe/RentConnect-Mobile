# Tenant Lead Posting Form - Complete Feature Guide

## Overview

The Tenant Lead Posting Form is a **4-step wizard** that collects rental requirements from tenants. This guide explains each feature in detail for mobile app implementation.

---

## Form Structure

| Step | Screen | Fields |
|------|--------|--------|
| 1 | Location | Location autocomplete + AI Quick Fill |
| 2 | Property Type | 6 property type options |
| 3 | Budget | Currency-aware input + presets |
| 4 | Contact | Name, Email, WhatsApp + OTP verification |

---

## Feature 1: Location Autocomplete

### How It Works (Web)
- Uses **Nominatim/OpenStreetMap API** (free, no API key required)
- Debounced search (300ms delay after typing stops)
- Returns structured location data (city, area, state, country, coordinates)

### API Endpoint
```
GET /api/location-search?q={query}&country=ke,in
```

### Request Flow
```
User Types → 300ms Debounce → API Call → Show Dropdown → User Selects → Store Data
```

### Response Structure
```javascript
{
  results: [
    {
      id: "123456",
      name: "Westlands",
      city: "Nairobi",
      area: "Westlands",
      state: "Nairobi County",
      country: "Kenya",
      countryCode: "KE",
      postcode: "00100",
      lat: -1.2641,
      lon: 36.8030
    }
  ]
}
```

### Mobile Implementation
```javascript
// React Native with debounce
const [query, setQuery] = useState('');
const [suggestions, setSuggestions] = useState([]);

const searchLocations = useCallback(
  debounce(async (text) => {
    if (text.length < 2) return setSuggestions([]);
    const response = await fetch(`${API_URL}/api/location-search?q=${text}&country=ke,in`);
    const data = await response.json();
    setSuggestions(data.results || []);
  }, 300),
  []
);

// Use FlatList for dropdown
<TextInput value={query} onChangeText={(t) => { setQuery(t); searchLocations(t); }} />
<FlatList data={suggestions} renderItem={({item}) => <LocationItem location={item} />} />
```

### "Use Current Location" Feature
```
GET /api/geocode?lat={latitude}&lon={longitude}
```
- Uses device GPS to get coordinates
- Reverse geocodes to get structured address
- Mobile: Use `expo-location` or `@react-native-community/geolocation`

---

## Feature 2: AI Quick Fill

### How It Works
- User describes requirements in natural language
- AI (Groq/Llama-3.3-70b) extracts structured data
- Auto-fills form fields: location, propertyType, budget

### API Endpoint
```
POST /api/ai/parse-requirements
Content-Type: application/json

{
  "text": "2 bedroom in Westlands, budget 50k, need parking"
}
```

### Response
```javascript
{
  success: true,
  data: {
    location: "Westlands, Nairobi",
    propertyType: "2 Bedroom",  // Must match: "1 Bedroom", "2 Bedroom", "3 Bedroom", "Studio", "Self Contain", "Duplex"
    budget: 50000,              // Number (converts "50k" → 50000)
    bedrooms: 2,
    additionalNotes: "need parking"
  }
}
```

### Mobile Implementation
```javascript
const [aiInput, setAiInput] = useState('');
const [isLoading, setIsLoading] = useState(false);

const handleAiParse = async () => {
  if (aiInput.length < 10) return;
  setIsLoading(true);
  try {
    const response = await fetch(`${API_URL}/api/ai/parse-requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: aiInput })
    });
    const result = await response.json();
    if (result.success) {
      // Auto-fill form fields
      setFormData(prev => ({
        ...prev,
        location: result.data.location || prev.location,
        propertyType: result.data.propertyType || prev.propertyType,
        budget: result.data.budget?.toString() || prev.budget
      }));
    }
  } finally {
    setIsLoading(false);
  }
};
```

### UI Design (Collapsible Panel)
- Hidden by default (toggle button)
- Textarea for natural language input
- "Auto-Fill Form" button with loading state
- Success/error feedback messages

---

## Feature 3: Property Type Selection

### Options (6 types)
```javascript
const PROPERTY_TYPES = [
  { id: "1 Bedroom", label: "1 Bedroom", icon: "Home", description: "Perfect for singles or couples" },
  { id: "2 Bedroom", label: "2 Bedroom", icon: "Building", description: "Ideal for small families" },
  { id: "3 Bedroom", label: "3+ Bedroom", icon: "Castle", description: "Spacious family living" },
  { id: "Studio", label: "Studio", icon: "Hotel", description: "Compact & efficient" },
  { id: "Self Contain", label: "Self Contain", icon: "Store", description: "All-in-one living space" },
  { id: "Duplex", label: "Duplex", icon: "Warehouse", description: "Two-story living" }
];
```

### Mobile Implementation
- 2-column grid layout
- Card-style buttons with icon, label, description
- Selected state: orange border + checkmark badge
- Haptic feedback on selection

---

## Feature 4: Budget Input with Presets

### Currency Configuration (by country)
```javascript
const CURRENCY_CONFIG = {
  KE: { symbol: 'KSh', code: 'KES', locale: 'en-KE' },
  IN: { symbol: '₹', code: 'INR', locale: 'en-IN' },
  US: { symbol: '$', code: 'USD', locale: 'en-US' },
  NG: { symbol: '₦', code: 'NGN', locale: 'en-NG' },
};
```

### Budget Presets (Kenya)
```javascript
const BUDGET_PRESETS_KE = [
  { label: 'Under 20K', min: 0, max: 20000 },
  { label: '20K - 40K', min: 20000, max: 40000 },
  { label: '40K - 70K', min: 40000, max: 70000 },
  { label: '70K - 100K', min: 70000, max: 100000 },
  { label: '100K+', min: 100000, max: 500000 },
];
```

### Mobile Implementation
```javascript
// TextInput for custom amount
<TextInput
  value={formattedBudget}
  onChangeText={(text) => {
    const rawValue = text.replace(/[^0-9]/g, '');
    setBudget(rawValue);
  }}
  keyboardType="numeric"
  placeholder="Enter amount"
/>

// Horizontal ScrollView for presets
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  {presets.map((preset, index) => (
    <TouchableOpacity
      key={index}
      onPress={() => handlePresetSelect(preset)}
      style={[styles.presetChip, selectedPreset === index && styles.presetActive]}
    >
      <Text>{preset.label}</Text>
    </TouchableOpacity>
  ))}
</ScrollView>
```

### Data Stored
```javascript
{
  budget: "50000",           // Raw value
  budgetFormatted: "KSh 50,000",
  currency: "KES"
}
```

---

## Feature 5: Contact Details Section

### Fields
| Field | Type | Validation | Required |
|-------|------|------------|----------|
| Name | Text | Min 2 chars | ✅ Yes |
| Email | Email | Valid email format | ✅ Yes |
| WhatsApp | Phone | E.164 format | ❌ Optional |

### Phone Input (International)
- Uses `react-phone-number-input` library
- Auto-detects country from location selection
- Validates using `isValidPhoneNumber()`

### Mobile Implementation
```javascript
// For React Native, use: react-native-phone-number-input
import PhoneInput from 'react-native-phone-number-input';

<PhoneInput
  defaultCode={countryCode}  // "KE" or "IN"
  value={whatsapp}
  onChangeFormattedText={setWhatsapp}
  layout="first"
  withDarkTheme={false}
  withShadow
/>
```

---

## Feature 6: WhatsApp OTP Verification

### Flow Diagram
```
┌─────────────────┐
│ Phone Input     │
│ (idle state)    │
└────────┬────────┘
         │ Valid phone + Click "Verify"
         ▼
┌─────────────────┐     POST /api/send-otp
│ Sending...      │ ──────────────────────►
│ (loading state) │
└────────┬────────┘
         │ OTP Sent
         ▼
┌─────────────────────────────────────┐
│ OTP Input Screen                    │
│ ┌───┬───┬───┬───┬───┬───┐          │
│ │ _ │ _ │ _ │ _ │ _ │ _ │  6 digits │
│ └───┴───┴───┴───┴───┴───┘          │
│                                     │
│ Code expires in: 4:59              │
│                                     │
│ [Verify Code]                       │
│                                     │
│ Change Number    Resend in 30s     │
└────────┬────────────────────────────┘
         │ Enter 6 digits
         ▼
┌─────────────────┐     POST /api/verify-otp
│ Verifying...    │ ────────────────────────►
│ (loading state) │
└────────┬────────┘
         │ Success
         ▼
┌─────────────────┐
│ ✓ Verified      │
│ (success state) │
└─────────────────┘
```

### Verification States
```javascript
const [verificationStep, setVerificationStep] = useState('idle');
// States: 'idle' | 'sending' | 'sent' | 'verifying' | 'verified'
```

### API: Send OTP
```
POST /api/send-otp
{
  "phoneNumber": "+254712345678"
}

Response:
{
  "success": true,
  "message": "Verification code sent via SMS",
  "expiresIn": 300  // 5 minutes in seconds
}
```

### API: Verify OTP
```
POST /api/verify-otp
{
  "phoneNumber": "+254712345678",
  "otp": "123456"
}

Response (Success):
{
  "success": true,
  "verified": true
}

Response (Error):
{
  "success": false,
  "error": "Invalid code. 4 attempts remaining."
}
```

### Rate Limiting
- Max 3 OTP requests per phone per 10 minutes
- Must wait 30 seconds between requests
- Max 5 verification attempts per OTP

### Mobile OTP Input Component
```javascript
// 6 individual TextInputs with auto-focus
const OTPInput = ({ length = 6, onComplete }) => {
  const [otp, setOtp] = useState(Array(length).fill(''));
  const inputRefs = useRef([]);

  const handleChange = (text, index) => {
    if (!/^\d*$/.test(text)) return;  // Only digits

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-advance to next input
    if (text && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (newOtp.every(d => d !== '')) {
      onComplete(newOtp.join(''));
    }
  };

  return (
    <View style={styles.otpContainer}>
      {otp.map((digit, i) => (
        <TextInput
          key={i}
          ref={el => inputRefs.current[i] = el}
          value={digit}
          onChangeText={(t) => handleChange(t, i)}
          keyboardType="number-pad"
          maxLength={1}
          style={styles.otpInput}
        />
      ))}
    </View>
  );
};
```

### OTP Screen UI Elements
1. **Header**: "Enter the 6-digit code sent to +254 7XX XXX XXX"
2. **OTP Input**: 6 boxes, auto-advance
3. **Timer**: "Code expires in 4:59" (countdown)
4. **Verify Button**: Disabled until 6 digits entered
5. **Actions Row**: "Change Number" (left) | "Resend Code" (right, after 30s)
6. **Error State**: Red border on inputs + error message

---

## Feature 7: Form Submission

### Submit Payload
```javascript
{
  // Location
  location: "Westlands, Nairobi",
  locationData: { city, area, state, country, countryCode, lat, lon },
  city: "Nairobi",
  area: "Westlands",
  state: "Nairobi County",
  country: "Kenya",
  countryCode: "KE",

  // Property
  type: "2 Bedroom",
  bedrooms: 2,

  // Budget
  budget: "50000",
  budgetFormatted: "KSh 50,000",
  currency: "KES",

  // Contact
  name: "John Doe",
  email: "john@example.com",
  whatsapp: "+254712345678"
}
```

### Success Screen
- Confetti animation
- "Congratulations!" message
- "Agents in {location} will contact you shortly"
- Buttons: "Back to Home" | "Post Another Request"

---

## Mobile-Specific Recommendations

### Navigation
```javascript
// Use React Navigation stack
const TenantFormStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Step1_Location" component={LocationStep} />
    <Stack.Screen name="Step2_PropertyType" component={PropertyTypeStep} />
    <Stack.Screen name="Step3_Budget" component={BudgetStep} />
    <Stack.Screen name="Step4_Contact" component={ContactStep} />
    <Stack.Screen name="Success" component={SuccessScreen} />
  </Stack.Navigator>
);
```

### State Management
```javascript
// Use Context or Zustand to share form data across screens
const FormContext = createContext();

const FormProvider = ({ children }) => {
  const [formData, setFormData] = useState({
    location: '', locationData: null,
    type: '', bedrooms: 0,
    budget: '', currency: 'KES',
    name: '', email: '', whatsapp: ''
  });

  return (
    <FormContext.Provider value={{ formData, setFormData }}>
      {children}
    </FormContext.Provider>
  );
};
```

### Required Packages
```json
{
  "dependencies": {
    "react-native-phone-number-input": "^2.1.0",
    "lodash.debounce": "^4.0.8",
    "react-native-confetti-cannon": "^1.5.2",
    "@react-native-community/geolocation": "^3.0.0"
  }
}
```

### UI Guidelines
| Element | Web | Mobile |
|---------|-----|--------|
| Input Height | 48-52px | 48-56px |
| Border Radius | 12px | 12px |
| Primary Color | #FE9200 | #FE9200 |
| Touch Target | N/A | Min 44x44px |
| Font Sizes | 14-18px | 14-18px |

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/location-search` | GET | Location autocomplete |
| `/api/geocode` | GET | Reverse geocode (GPS → Address) |
| `/api/ai/parse-requirements` | POST | AI auto-fill |
| `/api/send-otp` | POST | Send SMS verification |
| `/api/verify-otp` | POST | Verify OTP code |

---

## Environment Variables (Mobile)

```env
# API Base URL
API_BASE_URL=https://your-backend-url.com

# For development
API_BASE_URL=http://localhost:3000
```

Note: The AI and SMS features require backend API keys (GROQ_API_KEY, Africa's Talking credentials) which are configured on the server only - the mobile app just calls the API endpoints.

