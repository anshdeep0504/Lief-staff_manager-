# Lief Healthcare - Staff Management System
> **Note for Admin Access:**  
> For initial setup or testing purposes, the admin credentials are available internally: email `aoeamsi150@gmail.com` and password `Password1.`
A comprehensive healthcare staff time tracking and management system built with Next.js, Supabase, and Ant Design.

## ✨ Features

- 🔐 **Authentication**: Secure login/register system with Supabase Auth
- 📍 **GPS Tracking**: Clock in/out with real-time location validation
- 🎯 **Perimeter Management**: Configurable work area boundaries with manager settings
- 📊 **Analytics Dashboard**: Comprehensive staff performance insights with real-time data
- 🎨 **Modern UI**: Beautiful interface built with Ant Design
- 📈 **Real-time Data**: Live updates with Supabase real-time subscriptions
- 🔔 **Smart Notifications**: Automatic alerts for perimeter entry/exit
- 📍 **Location Intelligence**: Real-time distance calculations and status updates

## 🚀 New Features (Latest Update)

### Enhanced Manager Controls
- **Perimeter Settings**: Configure work area center and radius
- **Real-time Monitoring**: Track staff location and perimeter status
- **Advanced Analytics**: Enhanced charts with real data calculations
- **Staff Management**: Comprehensive shift tracking and reporting

### Progressive Web App (PWA)
- **Installable**: Add to home screen on any device
- **Offline Support**: Works without internet connection
- **Push Notifications**: Get alerts for important updates
- **Native Experience**: App-like interface and functionality

### Improved User Experience
- **Smart Location Tracking**: Automatic perimeter detection
- **Real-time Status**: Live updates on location and shift status
- **Enhanced UI**: Better visual feedback and user guidance
- **Mobile Optimized**: Responsive design for all devices

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: Ant Design 5
- **Charts**: Chart.js with react-chartjs-2
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel-ready

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

## 🚀 Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd lief-healthcare
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Schema

Run these SQL commands in your Supabase SQL editor:

```sql
-- Create manager settings table
CREATE TABLE manager_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  perimeter_lat DECIMAL(10, 8) NOT NULL,
  perimeter_long DECIMAL(11, 8) NOT NULL,
  radius_km DECIMAL(5, 2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shifts table
CREATE TABLE shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  clock_in_location TEXT NOT NULL,
  clock_out_location TEXT,
  clock_in_note TEXT,
  clock_out_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_shifts_user_id ON shifts(user_id);
CREATE INDEX idx_shifts_clock_in_time ON shifts(clock_in_time);
CREATE INDEX idx_shifts_clock_out_time ON shifts(clock_out_time);

-- Insert sample manager settings (adjust coordinates as needed)
INSERT INTO manager_settings (perimeter_lat, perimeter_long, radius_km) 
VALUES (40.7128, -74.0060, 1.0);

-- Enable Row Level Security (RLS)
ALTER TABLE manager_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own shifts" ON shifts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shifts" ON shifts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shifts" ON shifts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view manager settings" ON manager_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_manager_settings_updated_at 
  BEFORE UPDATE ON manager_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at 
  BEFORE UPDATE ON shifts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for shift statistics
CREATE VIEW shift_stats AS
SELECT 
  user_id,
  COUNT(*) as total_shifts,
  COUNT(CASE WHEN clock_out_time IS NOT NULL THEN 1 END) as completed_shifts,
  SUM(CASE WHEN clock_out_time IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (clock_out_time - clock_in_time)) / 3600 
    ELSE 0 END) as total_hours,
  AVG(CASE WHEN clock_out_time IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (clock_out_time - clock_in_time)) / 3600 
    ELSE NULL END) as avg_hours_per_shift
FROM shifts
GROUP BY user_id;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 Usage

### Authentication
- Visit `/auth` to register or login
- Email verification required for new accounts

### Clock In/Out
- Navigate to `/clock` to track your time
- GPS location is required for clock in/out
- Perimeter validation ensures you're within the allowed area
- Real-time location tracking and status updates

### Manager Dashboard
- Access `/dashboard` for comprehensive analytics
- View staff logs, charts, and statistics
- Configure perimeter settings in the Settings tab
- Filter data by date ranges

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Yes |

## 📁 Project Structure

```
lief-healthcare/
├── app/
│   ├── auth/           # Authentication page
│   ├── clock/          # Clock in/out functionality
│   ├── dashboard/      # Manager dashboard with settings
│   ├── components/     # Reusable components
│   │   ├── ManagerSettings.tsx    # Perimeter configuration
│   │   
│   │   
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout with PWA meta tags
│   └── page.tsx        # Home page with PWA features
├── lib/
│   └── supabase.ts     # Supabase client configuration
├── public/             # Static assets
│   ├── manifest.json   # PWA manifest
│   ├── sw.js          # Service worker
│   └── icons/         # PWA icons
├── .env.local          # Environment variables (create this)
└── package.json        # Dependencies
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🔒 Security Features

- Row Level Security (RLS) enabled on all tables
- User authentication required for all operations
- GPS perimeter validation for clock in/out
- Secure API key handling



## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🆘 Support

For issues and questions:
- Check the [Supabase documentation](https://supabase.com/docs)
- Review [Next.js documentation](https://nextjs.org/docs)
- Open an issue in this repository

## 🗺 Roadmap

- [x] Push notifications for clock in/out
- [x] Advanced reporting and analytics
- [x] Manager perimeter settings
- [x] Real-time location tracking
- [ ] Multi-location support
- [ ] Advanced scheduling features
- [ ] Payroll integration
- [ ] Mobile app (React Native)
- [ ] Biometric authentication
- [ ] Advanced geofencing

## 🎯 Key Benefits

### For Healthcare Workers
- **Easy Clock In/Out**: Simple one-tap time tracking
- **Location Validation**: Automatic perimeter detection
- **Mobile First**: Works perfectly on mobile devices
- **Offline Capable**: Continue working without internet

### For Managers
- **Real-time Monitoring**: Live staff location and status
- **Configurable Boundaries**: Set work area perimeters
- **Comprehensive Analytics**: Detailed reports and insights
- **Staff Management**: Complete shift tracking and oversight

### For Organizations
- **Compliance**: Accurate time and location records
- **Efficiency**: Streamlined staff management
- **Cost Savings**: Reduced administrative overhead
- **Scalability**: Handles multiple locations and staff
