-- Add admin role to user 8d281470-b405-4685-9c29-5d12966185a0

INSERT INTO admin_users (id, role) 
VALUES ('8d281470-b405-4685-9c29-5d12966185a0', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';

