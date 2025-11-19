# Storage Setup Instructions

Since we cannot modify storage policies via SQL due to permissions, follow these steps in the Supabase Dashboard:

## Step 1: Create the Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Enter these settings:
   - **Name**: `user-uploads`
   - **Public**: ✅ Enabled (check this box)
   - Click **Create bucket**

## Step 2: Set Up Storage Policies

1. In the Storage section, find the `user-uploads` bucket
2. Click on the bucket name
3. Click on **Policies** tab at the top
4. Click **New Policy**

### Create 4 Policies:

#### Policy 1: Upload Own Avatars
- **Policy Name**: `Users can upload their own avatars`
- **Allowed Operation**: `INSERT`
- **Target Roles**: `authenticated`
- **Policy Definition**:
```sql
bucket_id = 'user-uploads'
AND (storage.foldername(name))[1] = 'avatars'
AND (storage.foldername(name))[2] = auth.uid()::text
```

#### Policy 2: Update Own Avatars
- **Policy Name**: `Users can update their own avatars`
- **Allowed Operation**: `UPDATE`
- **Target Roles**: `authenticated`
- **Policy Definition**:
```sql
bucket_id = 'user-uploads'
AND (storage.foldername(name))[1] = 'avatars'
AND (storage.foldername(name))[2] = auth.uid()::text
```

#### Policy 3: Delete Own Avatars
- **Policy Name**: `Users can delete their own avatars`
- **Allowed Operation**: `DELETE`
- **Target Roles**: `authenticated`
- **Policy Definition**:
```sql
bucket_id = 'user-uploads'
AND (storage.foldername(name))[1] = 'avatars'
AND (storage.foldername(name))[2] = auth.uid()::text
```

#### Policy 4: View All Avatars
- **Policy Name**: `Anyone can view avatars`
- **Allowed Operation**: `SELECT`
- **Target Roles**: `public`
- **Policy Definition**:
```sql
bucket_id = 'user-uploads'
```

## Step 3: Test

After setting up all policies:
1. Go to your app's Settings page
2. Try uploading a profile picture
3. Try changing your username

Both should now work without errors!

## File Path Format

The app stores avatars in this format:
```
avatars/{user_id}/{timestamp}.{extension}
```

For example:
```
avatars/123e4567-e89b-12d3-a456-426614174000/1700000000000.jpg
```
