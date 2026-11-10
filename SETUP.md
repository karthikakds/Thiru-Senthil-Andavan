# Thiru Senthil Andavan Guest House — Setup & Publishing Guide

This is a React + Vite website connected to Supabase. It includes a public lodge website, booking enquiries, a private owner login, and an owner dashboard.

## Included

- The two real lodge photographs supplied for this project (`public/images/lodge-room-1.png` and `lodge-room-2.png`). They are copied unchanged from the uploaded originals.
- A separate devotional Lord Murugan banner illustration (`public/images/lord-murugan-banner.png`). This is artwork, not a photograph of the lodge.
- Public website with rooms, facilities, gallery, contact details, Google Maps link and enquiry form.
- Booking enquiry form saves to Supabase and opens WhatsApp with the enquiry details. A request is **not** a confirmed booking.
- Private owner login, password reset, logout, room/facility/attraction management, image uploads, enquiry status management, and editable site details.
- Supabase Row Level Security (RLS) policies and a public photo bucket with owner-only uploads.

## Important security note

No password was included in the source code. Do not use a password that has been shared in a chat or put a password, Supabase `service_role` key, or other secret in the frontend. The frontend uses only the Supabase project URL and public anon/publishable key. RLS enforces owner-only writes.

## 1. Create a Supabase project

1. Open [Supabase](https://supabase.com/) and create/sign in to an account.
2. Create a new project. Select the Free plan; do not add paid compute, add-ons or billing upgrades.
3. Wait for the database to finish provisioning.
4. Open **Project Settings → API** (or API Keys).
5. Copy the Project URL and the public anon/publishable key. Do not copy the `service_role` or secret key.
6. Open **SQL Editor → New query**, paste all of `supabase/schema.sql`, and run it.

Supabase Free currently has usage limits, including 500 MB database size, 1 GB Storage, and 5 GB egress in its plan comparison/billing documentation. Free projects may pause after inactivity. Check current official limits before launch and keep photo sizes small:
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/storage/serving/bandwidth

## 2. Create the owner login securely

1. In Supabase, open **Authentication → Users → Add user**.
2. Enter the owner's email address and create a new strong password privately. Do not reuse a password posted in chat.
3. Confirm the user if the dashboard offers that option.
4. Copy the new user's UUID from the Users list.
5. In Supabase SQL Editor, run this statement after replacing the UUID:

   ```sql
   insert into public.owner_admins (user_id)
   values ('PASTE-AUTH-USER-UUID-HERE');
   ```

Only a user whose UUID is in `owner_admins` can manage website data. Do not add public visitors to this table.

## 3. Connect this website to Supabase

1. Install Node.js LTS from https://nodejs.org/.
2. Extract this ZIP.
3. In the project folder, copy `.env.example` to a new file named `.env`.
4. Fill in your values:

   ```env
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
   ```

5. Open a terminal in the project folder and run:

   ```bash
   npm install
   npm run dev
   ```

6. Open the local address printed by Vite (normally http://localhost:5173).
7. Test a public enquiry, then open **Owner Login** in the footer and sign in.

## 4. Publish free with Netlify

1. Create a free account at https://www.netlify.com/.
2. Push this project to a GitHub repository, or use Netlify's manual deploy flow after building.
3. For Git-based deployment, select **Add new site → Import an existing project** and choose your repository.
4. Set build command to `npm run build` and publish directory to `dist`.
5. In **Site configuration → Environment variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Trigger a new deploy.
7. Your site will receive a Netlify subdomain. You can change the subdomain in Site settings if your preferred name is available.

Netlify Free is currently $0 with a monthly credit allowance and hard usage limits; sites may pause at the limit. Review https://www.netlify.com/pricing/ before launch. Do not enable paid add-ons or auto-recharge.

## 5. Optional GitHub Pages

A Vite app can also be hosted on GitHub Pages, but it requires a GitHub Actions build workflow and correct base path. Netlify is the simpler option for a first deployment and supports setting environment variables in its dashboard.

## 6. Test before sharing the link

- Check the site on a phone and computer. The Murugan devotional artwork is separate from the two unchanged real room photos; the room gallery uses the original photos.
- Verify the phone number, email and Google Maps link.
- Submit a test enquiry and confirm it appears in Owner Dashboard → Enquiries.
- Sign out and verify that private enquiries and editing controls are not accessible.
- Sign in as the owner and test adding/editing a room, uploading a small image, and changing a facility.
- Confirm all room rates, AC/Non-AC types, facilities, check-in details and availability with the owner before advertising them.
- Check that booking requests are described as enquiries, not confirmed reservations.

## 7. Backups and ongoing care

- Periodically use Supabase Dashboard → Database → Backups/exports where available, or export tables from the Table Editor.
- Download original room photographs and keep a separate copy.
- Keep the project ZIP and GitHub repository as source backups.
- Review Supabase usage and Netlify credits monthly.
- Do not expose the Supabase service-role key in this website.

## Google Search visibility

Publishing the website does not automatically guarantee a Google Search listing. After deployment:
1. Open https://search.google.com/search-console/ and add the deployed website URL.
2. Verify ownership using one of the methods Google offers.
3. Submit the homepage URL for indexing.
4. Keep the business name, address and phone number consistent with the business's Google Business Profile, if one exists.

## Current limitations / owner confirmation needed

- Owner's personal name, profile photo and biography were not supplied, so the site uses neutral owner-managed wording.
- Actual AC/Non-AC room inventory, rates, amenities, parking, lift, water supply and family-room availability must be confirmed before publishing those claims. The initial content avoids claiming unverified services.
- The booking form stores enquiries; it does not check live inventory, take payment, or automatically confirm reservations.
- This project is prepared for deployment. It is not live until the owner completes the account setup and publishing steps above.
