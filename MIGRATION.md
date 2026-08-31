# Migration Guide: Template Cleanup

This repository has been converted from a device-specific application to a clean template for RN + WebView + Server projects.

## Removed Features

The following features have been removed to create a clean template:

- **Device Provisioning**: BLE-based device onboarding system
- **Streaming**: Live video streaming via MediaMTX/HLS
- **MQTT**: Real-time device communication
- **Device Control**: Remote device command system
- **Device-Specific UI**: Device management, statistics, and monitoring screens

## Database Cleanup

If you were using this repository before the template cleanup, you may have device-related tables in your Supabase database that are no longer needed.

### Tables to Remove

Run the following SQL commands in your Supabase SQL editor to clean up device-related tables:

```sql
-- Drop user_devices table (user-device relationships)
DROP TABLE IF EXISTS user_devices CASCADE;

-- Drop devices table (device registry)
DROP TABLE IF EXISTS devices CASCADE;

-- Note: The 'users' table and auth-related tables should be preserved
```

### RLS Policies

If you had Row Level Security (RLS) policies for these tables, they will be automatically removed when you drop the tables.

## Environment Variables Cleanup

Remove the following environment variables from your `.env` files if present:

```bash
# MQTT Configuration (no longer needed)
MQTT_BROKER_URL=mqtt://localhost:1883

# Streaming Configuration (no longer needed)
# Any MediaMTX or streaming-related URLs
```

## Infrastructure Cleanup

If you deployed the following infrastructure, you can now decommission it:

- **EC2 Instance**: MediaMTX streaming server (IP: 13.209.4.205)
- **MQTT Broker**: If you deployed a separate MQTT broker
- **Device Backend Services**: Any device-specific backend services

## What Remains

The template now includes:

- ✅ **Authentication System**: Login, signup, logout functionality
- ✅ **Routing**: Tab-based navigation with Expo Router
- ✅ **WebView Integration**: React Native WebView bridge
- ✅ **Internationalization**: i18n support (English/Korean)
- ✅ **Profile Management**: Account settings, language preferences
- ✅ **Notifications**: Generic notification list (template)
- ✅ **Dashboard**: Simple home dashboard (customizable)

## Next Steps

1. Review and remove the database tables mentioned above
2. Clean up environment variables
3. Decommission any device-related infrastructure
4. Start building your own features on top of this template!

For questions or issues, please refer to the repository documentation or open an issue on GitHub.
