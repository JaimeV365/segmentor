# Add Email to Cloudflare Access Policy

**Quick Guide:** Add customer email to Access policies so they can log in.

## Steps

1. **Go to Cloudflare Dashboard**
   - https://dash.cloudflare.com/

2. **Navigate to Zero Trust → Access**
   - Click **"Zero Trust"** in left sidebar
   - Click **"Access"** → **"Applications"**

3. **Find Your Brand+ Application**
   - Look for your Brand+ authentication application
   - Click on it

4. **Edit Policies**
   - Find the **"Policies"** section
   - Click **"Edit"** or **"Add a policy"**

5. **Add Email to Policy**
   - In the policy rules, find where emails are listed
   - Add the customer email address
   - Or add an email domain if it's a company-wide access
   - Click **"Save"**

6. **Done!**
   - Customer can now log in
   - After login, KV will check if they get Brand+ features

## Important

- **Access Policy** = Can they log in? (Authentication)
- **KV** = Do they get Brand+ features? (Authorization)

Both are needed!

