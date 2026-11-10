import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = envUrl && envKey ? createClient(envUrl, envKey) : null;

const initialSettings = {
  business_name: 'Thiru Senthil Andavan Guest House',
  business_subtitle: 'GUEST HOUSE & LODGE SERVICE',
  tagline: 'Comfortable Stay, Warm Hospitality, Affordable Prices.',
  hero_title: 'Thiru Senthil Andavan Guest House',
  hero_text: 'A welcoming place to rest, refresh and feel at ease. Contact us directly for room details and availability.',
  phone: '9443002130',
  whatsapp: '9443002130',
  email: 'sethuraman894@gmail.com',
  address: '10, South Maasi Street, Tuticorin Road, Near Canara Bank, Srivaikundam - 628601',
  map_url: 'https://maps.app.goo.gl/T3eUQ3oikxemLH9X9?g_st=aw',
  owner_intro: 'Contact our owner-managed guest house team for room information and booking enquiries.',
  hero_image: '/images/lord-murugan-banner.png'
};

const demoRooms = [
  { id: 'demo-1', name: 'Double Bedroom', room_type: 'Double', ac_type: 'Non-AC', price: null, description: 'A simple, comfortable room for guests. Contact us for current rates and availability.', image_url: '/images/lodge-room-2.png', is_available: true, is_active: true },
  { id: 'demo-2', name: 'Twin Bed Room', room_type: 'Twin', ac_type: 'Confirm with owner', price: null, description: 'Room shown in the guest house photo gallery. Please enquire about the room configuration.', image_url: '/images/lodge-room-1.png', is_available: true, is_active: true }
];

const demoFacilities = ['Comfortable furnished rooms', 'Guest room photographs available', 'Direct phone and WhatsApp enquiries'];
const demoAttractions = [
  { id: 'demo-a1', title: 'Srivaikuntam Temple', caption: 'A well-known local place of worship. Confirm visiting details before travelling.', image_url: '' },
  { id: 'demo-a2', title: 'Explore Srivaikundam', caption: 'Ask the guest house team for information about nearby places and local travel.', image_url: '' }
];

function cleanPhone(value) { return (value || '').replace(/\D/g, ''); }
function whatsappLink(number, message='Hello, I would like to enquire about rooms at Thiru Senthil Andavan Guest House.') {
  const digits = cleanPhone(number);
  const intl = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}
function SectionTitle({ eyebrow, title, children }) {
  return <div className="section-title"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{children && <p>{children}</p>}</div>;
}
function Photo({ src, alt, className='' }) {
  return <img className={className} src={src || '/images/lodge-room-1.png'} alt={alt} loading="lazy" onError={e => { e.currentTarget.src='/images/lodge-room-1.png'; }} />;
}

export default function App() {
  const [settings, setSettings] = useState(initialSettings);
  const [rooms, setRooms] = useState(demoRooms);
  const [facilities, setFacilities] = useState(demoFacilities);
  const [attractions, setAttractions] = useState(demoAttractions);
  const [enquiry, setEnquiry] = useState({ guest_name:'', phone:'', check_in:'', check_out:'', guests:'1', room_type:'Any available room', message:'' });
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState(null);
  const [adminOpen, setAdminOpen] = useState(window.location.hash === '#owner');
  const [login, setLogin] = useState({ email:'', password:'' });
  const [tab, setTab] = useState('rooms');
  const [roomDraft, setRoomDraft] = useState(null);
  const [facilityDraft, setFacilityDraft] = useState('');
  const [attractionDraft, setAttractionDraft] = useState({ title:'', caption:'', image_url:'' });
  const [enquiries, setEnquiries] = useState([]);
  const [settingsDraft, setSettingsDraft] = useState(initialSettings);

  const configured = Boolean(supabase);
  const phoneLink = `tel:${cleanPhone(settings.phone)}`;
  const mapLink = settings.map_url || initialSettings.map_url;

  useEffect(() => {
    if (!configured) return;
    let alive = true;
    async function load() {
      const [s,r,f,a] = await Promise.all([
        supabase.from('site_settings').select('data').eq('id',1).maybeSingle(),
        supabase.from('rooms').select('*').eq('is_active',true).order('created_at',{ascending:true}),
        supabase.from('facilities').select('*').eq('is_active',true).order('created_at',{ascending:true}),
        supabase.from('attractions').select('*').eq('is_active',true).order('created_at',{ascending:true})
      ]);
      if (!alive) return;
      if (s.data?.data) setSettings({...initialSettings,...s.data.data});
      if (r.data) setRooms(r.data);
      if (f.data) setFacilities(f.data.map(x=>x.name));
      if (a.data) setAttractions(a.data);
    }
    load();
    supabase.auth.getSession().then(({data}) => { if(alive) setSession(data.session); });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,newSession)=>setSession(newSession));
    return () => { alive=false; subscription.unsubscribe(); };
  }, [configured]);

  useEffect(() => {
    if (!configured || !session || !adminOpen) return;
    refreshEnquiries();
    setSettingsDraft(settings);
  }, [configured, session, adminOpen]);

  async function refreshEnquiries() {
    if (!supabase) return;
    const {data,error} = await supabase.from('enquiries').select('*').order('created_at',{ascending:false});
    if (error) setNotice(error.message); else setEnquiries(data || []);
  }
  async function submitEnquiry(e) {
    e.preventDefault();
    if (!enquiry.guest_name.trim() || !/^[0-9+\-\s]{8,15}$/.test(enquiry.phone)) {
      setNotice('Please enter your name and a valid phone number.'); return;
    }
    if (enquiry.check_in && enquiry.check_out && enquiry.check_out < enquiry.check_in) {
      setNotice('Check-out date must be after check-in date.'); return;
    }
    setBusy(true); setNotice('');
    const payload = {...enquiry, status:'New'};
    if (configured) {
      const {error} = await supabase.from('enquiries').insert(payload);
      if (error) { setNotice(`Enquiry could not be submitted: ${error.message}`); setBusy(false); return; }
      setNotice('Thank you! Your enquiry has been sent. The owner will contact you to confirm availability.');
    } else {
      setNotice('Website preview mode: connect Supabase to receive and manage enquiries online. You can contact the owner directly using WhatsApp.');
    }
    const msg = `Room enquiry\nName: ${enquiry.guest_name}\nPhone: ${enquiry.phone}\nCheck-in: ${enquiry.check_in || 'Not specified'}\nCheck-out: ${enquiry.check_out || 'Not specified'}\nGuests: ${enquiry.guests}\nRoom: ${enquiry.room_type}\nMessage: ${enquiry.message || 'None'}`;
    window.open(whatsappLink(settings.whatsapp || settings.phone,msg),'_blank','noopener,noreferrer');
    setBusy(false);
    if (configured) setEnquiry({guest_name:'',phone:'',check_in:'',check_out:'',guests:'1',room_type:'Any available room',message:''});
  }
  async function signIn(e) {
    e.preventDefault();
    if (!configured) { setNotice('Add your Supabase project URL and anon key in the .env file first.'); return; }
    const {error} = await supabase.auth.signInWithPassword(login);
    setNotice(error ? error.message : 'Signed in successfully.');
  }
  async function resetPassword() {
    if (!configured || !login.email) { setNotice('Enter your owner email address first.'); return; }
    const {error} = await supabase.auth.resetPasswordForEmail(login.email,{redirectTo:window.location.origin+'/#owner'});
    setNotice(error ? error.message : 'Password reset email sent. Check your inbox.');
  }
  async function signOut() { await supabase.auth.signOut(); setSession(null); setNotice('You have been logged out.'); }
  async function saveSettings(e) {
    e.preventDefault();
    const {error} = await supabase.from('site_settings').upsert({id:1,data:settingsDraft});
    if (error) setNotice(error.message); else { setSettings(settingsDraft); setNotice('Website details updated.'); }
  }
  async function saveRoom(e) {
    e.preventDefault();
    const payload = {...roomDraft, price: roomDraft.price === '' ? null : Number(roomDraft.price)};
    const {id,...rest} = payload;
    const result = id && !String(id).startsWith('new-')
      ? await supabase.from('rooms').update(rest).eq('id',id)
      : await supabase.from('rooms').insert(rest);
    if (result.error) { setNotice(result.error.message); return; }
    const {data} = await supabase.from('rooms').select('*').eq('is_active',true).order('created_at');
    setRooms(data || []); setRoomDraft(null); setNotice('Room saved.');
  }
  async function uploadImage(file, onUrl) {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5*1024*1024) { setNotice('Choose an image file smaller than 5 MB.'); return; }
    const ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'') || 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const {error} = await supabase.storage.from('lodge-images').upload(path,file,{upsert:false,contentType:file.type});
    if (error) { setNotice(`Photo upload failed: ${error.message}`); return; }
    const {data} = supabase.storage.from('lodge-images').getPublicUrl(path);
    onUrl(data.publicUrl); setNotice('Photo uploaded. Save the form to publish it.');
  }
  async function addFacility(e) {
    e.preventDefault(); if (!facilityDraft.trim()) return;
    const {error} = await supabase.from('facilities').insert({name:facilityDraft.trim(),is_active:true});
    if (error) setNotice(error.message); else { const {data}=await supabase.from('facilities').select('*').eq('is_active',true); setFacilities((data||[]).map(x=>x.name)); setFacilityDraft(''); setNotice('Facility added.'); }
  }
  async function removeFacility(name) {
    if (!window.confirm(`Remove facility "${name}"?`)) return;
    const {error}=await supabase.from('facilities').update({is_active:false}).eq('name',name);
    if (error) setNotice(error.message); else setFacilities(facilities.filter(x=>x!==name));
  }
  async function saveAttraction(e) {
    e.preventDefault();
    const {error}=await supabase.from('attractions').insert({...attractionDraft,is_active:true});
    if (error) setNotice(error.message); else { const {data}=await supabase.from('attractions').select('*').eq('is_active',true); setAttractions(data||[]); setAttractionDraft({title:'',caption:'',image_url:''}); setNotice('Attraction added.'); }
  }
  async function deleteRoom(room) {
    if (!window.confirm(`Remove ${room.name}?`)) return;
    const {error}=await supabase.from('rooms').update({is_active:false}).eq('id',room.id);
    if (error) setNotice(error.message); else setRooms(rooms.filter(x=>x.id!==room.id));
  }
  async function updateEnquiryStatus(id,status) {
    const {error}=await supabase.from('enquiries').update({status}).eq('id',id);
    if (error) setNotice(error.message); else setEnquiries(enquiries.map(x=>x.id===id?{...x,status}:x));
  }

  return <div className="site">
    <div className="topbar"><div className="container topbar-inner"><span>Welcome to Srivaikundam, Tamil Nadu</span><span>Call for enquiries: <a href={phoneLink}>{settings.phone}</a></span></div></div>
    <header className="header"><div className="container nav">
      <a className="brand" href="#"><span className="brand-mark">SA</span><span><b>THIRU SENTHIL ANDAVAN</b><small>GUEST HOUSE & LODGE SERVICE</small></span></a>
      <nav><a href="#rooms">Rooms</a><a href="#facilities">Facilities</a><a href="#gallery">Gallery</a><a href="#contact">Contact</a></nav>
      <a className="button button-gold nav-cta" href="#booking">Enquire Now</a>
    </div></header>

    <main>
      <section className="hero">
        <div className="container hero-layout">
          <div className="hero-content"><span className="eyebrow light">YOUR STAY IN SRIVAIKUNDAM</span>
            <h1>{settings.hero_title}</h1><p className="hero-tag">{settings.tagline}</p><p className="hero-copy">{settings.hero_text}</p>
            <div className="hero-actions"><a className="button button-gold" href="#booking">Book a Room</a><a className="button button-outline" href="#contact">Contact Us</a></div>
            <div className="hero-note">Direct booking enquiries · Friendly service · Convenient town location</div>
          </div>
          <div className="hero-devotional-wrap"><Photo src={settings.hero_image || '/images/lord-murugan-banner.png'} alt="Devotional illustration of Lord Murugan with vel and peacock" className="hero-devotional"/><span className="devotional-caption">வேல் முருகா</span></div>
        </div>
      </section>

      <section className="intro section-pad"><div className="container intro-grid"><div><span className="eyebrow">A WARM WELCOME</span><h2>Rest easy. Feel at home.</h2><p>Thiru Senthil Andavan Guest House offers a welcoming place to stay in Srivaikundam. Contact us directly for current room options, rates and availability.</p><a className="text-link" href={mapLink} target="_blank" rel="noreferrer">Find our location ↗</a></div>
        <div className="intro-card"><div className="intro-icon">⌂</div><h3>Conveniently located</h3><p>{settings.address}</p><a href={mapLink} target="_blank" rel="noreferrer">Get directions →</a></div>
      </div></section>

      <section id="rooms" className="section-pad soft"><div className="container"><SectionTitle eyebrow="ACCOMMODATION" title="Our Rooms">Choose a room to suit your stay. Contact us to confirm the room type, current price and availability.</SectionTitle>
        <div className="room-grid">{rooms.filter(r=>r.is_active!==false).map(room=><article className="room-card" key={room.id}><Photo src={room.image_url} alt={room.name}/><div className="room-body"><div className="room-meta"><span>{room.ac_type || 'Room'}</span><span>{room.room_type || 'Accommodation'}</span></div><h3>{room.name}</h3><p>{room.description || 'Please contact us for room details.'}</p><div className="room-bottom"><strong>{room.price ? `₹${Number(room.price).toLocaleString('en-IN')} / night` : 'Price on enquiry'}</strong><a href="#booking">Enquire →</a></div><small className={room.is_available===false?'unavailable':'available'}>{room.is_available===false?'Availability: Please enquire':'Availability: Confirm with owner'}</small></div></article>)}</div>
      </div></section>

      <section id="facilities" className="section-pad"><div className="container"><SectionTitle eyebrow="GUEST COMFORT" title="Facilities & Services">Please contact the owner to confirm specific facilities before booking.</SectionTitle>
        <div className="facility-grid">{facilities.map((f,i)=><div className="facility" key={i}><span className="facility-check">✓</span><span>{f}</span></div>)}</div>
      </div></section>

      <section id="gallery" className="section-pad gallery-section"><div className="container"><SectionTitle eyebrow="A GLIMPSE INSIDE" title="Photo Gallery">Real photographs of our guest house rooms.</SectionTitle>
        <div className="gallery-grid"><Photo src="/images/lodge-room-1.png" alt="Guest house room with two beds"/><Photo src="/images/lodge-room-2.png" alt="Guest house double bedroom"/></div>
      </div></section>

      <section id="booking" className="section-pad booking-section"><div className="container booking-grid"><div><span className="eyebrow light">ROOM ENQUIRY</span><h2>Plan your stay with us</h2><p>Send your details and we will get back to you. Your room is not confirmed until the owner confirms availability.</p><div className="booking-direct"><span>Prefer to speak directly?</span><a href={phoneLink}>Call {settings.phone}</a><a href={whatsappLink(settings.whatsapp || settings.phone)}>WhatsApp us →</a></div></div>
        <form className="booking-form" onSubmit={submitEnquiry}><h3>Booking Enquiry</h3><div className="form-grid">
          <label>Guest name *<input required value={enquiry.guest_name} onChange={e=>setEnquiry({...enquiry,guest_name:e.target.value})} placeholder="Your full name"/></label>
          <label>Phone number *<input required value={enquiry.phone} onChange={e=>setEnquiry({...enquiry,phone:e.target.value})} placeholder="Your contact number" inputMode="tel"/></label>
          <label>Check-in date<input type="date" min={new Date().toISOString().slice(0,10)} value={enquiry.check_in} onChange={e=>setEnquiry({...enquiry,check_in:e.target.value})}/></label>
          <label>Check-out date<input type="date" min={enquiry.check_in || new Date().toISOString().slice(0,10)} value={enquiry.check_out} onChange={e=>setEnquiry({...enquiry,check_out:e.target.value})}/></label>
          <label>Number of guests<select value={enquiry.guests} onChange={e=>setEnquiry({...enquiry,guests:e.target.value})}>{[1,2,3,4,5,6,7,8,9,10].map(n=><option key={n}>{n}</option>)}</select></label>
          <label>Room preference<select value={enquiry.room_type} onChange={e=>setEnquiry({...enquiry,room_type:e.target.value})}><option>Any available room</option><option>Single room</option><option>Double room</option><option>AC room</option><option>Non-AC room</option><option>Family accommodation</option></select></label>
          <label className="full">Special requests<textarea rows="3" value={enquiry.message} onChange={e=>setEnquiry({...enquiry,message:e.target.value})} placeholder="Any additional information (optional)"/></label>
        </div><button className="button button-gold submit" disabled={busy}>{busy?'Sending…':'Send Enquiry & WhatsApp'}</button><small>Submitting an enquiry does not confirm a reservation.</small></form>
      </div></section>

      <section className="section-pad attractions"><div className="container"><SectionTitle eyebrow="EXPLORE THE AREA" title="Discover Srivaikundam">Ask us for local guidance and information about nearby places.</SectionTitle><div className="attraction-grid">{attractions.map(a=><article className="attraction-card" key={a.id}><div className="attraction-photo">{a.image_url?<Photo src={a.image_url} alt={a.title}/>:<span>SRIVAIKUNDAM</span>}</div><div><h3>{a.title}</h3><p>{a.caption}</p></div></article>)}</div></div></section>

      <section id="contact" className="section-pad contact-section"><div className="container contact-grid"><div><span className="eyebrow">GET IN TOUCH</span><h2>We are happy to help</h2><p>For room rates, availability and booking enquiries, please contact us directly.</p><div className="contact-details"><div><b>Address</b><span>{settings.address}</span></div><div><b>Phone</b><a href={phoneLink}>{settings.phone}</a></div><div><b>Email</b><a href={`mailto:${settings.email}`}>{settings.email}</a></div></div><div className="contact-actions"><a className="button button-navy" href={phoneLink}>Call Now</a><a className="button button-gold" href={mapLink} target="_blank" rel="noreferrer">Get Directions</a></div></div>
        <div className="map-card"><div className="map-pin">⌖</div><h3>Visit Thiru Senthil Andavan</h3><p>10, South Maasi Street, Tuticorin Road, Near Canara Bank, Srivaikundam - 628601</p><a href={mapLink} target="_blank" rel="noreferrer">Open Google Maps ↗</a></div>
      </div></section>
    </main>
    <footer><div className="container footer-grid"><div><div className="brand footer-brand"><span className="brand-mark">SA</span><span><b>THIRU SENTHIL ANDAVAN</b><small>GUEST HOUSE & LODGE SERVICE</small></span></div><p>{settings.tagline}</p></div><div><b>Quick Links</b><a href="#rooms">Rooms</a><a href="#facilities">Facilities</a><a href="#gallery">Gallery</a><a href="#booking">Booking Enquiry</a></div><div><b>Contact</b><a href={phoneLink}>{settings.phone}</a><a href={`mailto:${settings.email}`}>{settings.email}</a><a href={mapLink} target="_blank" rel="noreferrer">Google Maps</a></div></div><div className="container copyright"><span>© {new Date().getFullYear()} Thiru Senthil Andavan Guest House. All rights reserved.</span><button className="owner-link" onClick={()=>{setAdminOpen(true);window.location.hash='owner';}}>Owner Login</button></div></footer>

    {notice && <div className="toast" role="status"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Close">×</button></div>}

    {adminOpen && <div className="admin-overlay"><div className="admin-panel">
      <div className="admin-head"><div><span className="eyebrow">PRIVATE AREA</span><h2>Owner Dashboard</h2></div><button className="close-admin" onClick={()=>{setAdminOpen(false);window.location.hash='';}}>×</button></div>
      {!configured ? <div className="setup-warning"><h3>Supabase setup required</h3><p>This dashboard becomes active after you create a Supabase project, run the supplied SQL setup, and add the two environment variables in your hosting settings.</p><p><b>Do not enter your password here yet.</b> Follow SETUP.md in the project folder first.</p></div>
      : !session ? <form className="login-form" onSubmit={signIn}><h3>Owner Login</h3><label>Email address<input type="email" required value={login.email} onChange={e=>setLogin({...login,email:e.target.value})}/></label><label>Password<input type="password" required value={login.password} onChange={e=>setLogin({...login,password:e.target.value})}/></label><button className="button button-navy">Sign In</button><button type="button" className="text-button" onClick={resetPassword}>Forgot password?</button></form>
      : <><div className="admin-toolbar"><span>Signed in as {session.user.email}</span><button className="button button-small" onClick={signOut}>Log out</button></div>
        <div className="admin-tabs">{['rooms','facilities','enquiries','attractions','settings'].map(t=><button className={tab===t?'active':''} key={t} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>)}</div>
        <div className="admin-content">
          {tab==='rooms' && <><div className="admin-title-row"><h3>Manage Rooms</h3><button className="button button-gold button-small" onClick={()=>setRoomDraft({id:'new-'+Date.now(),name:'',room_type:'Double',ac_type:'Non-AC',price:'',description:'',image_url:'',is_available:true,is_active:true})}>+ Add room</button></div>
            {roomDraft && <form className="editor-form" onSubmit={saveRoom}><label>Room name<input required value={roomDraft.name} onChange={e=>setRoomDraft({...roomDraft,name:e.target.value})}/></label><div className="form-grid"><label>Room type<select value={roomDraft.room_type} onChange={e=>setRoomDraft({...roomDraft,room_type:e.target.value})}><option>Single</option><option>Double</option><option>Twin</option><option>Family</option></select></label><label>AC type<select value={roomDraft.ac_type} onChange={e=>setRoomDraft({...roomDraft,ac_type:e.target.value})}><option>AC</option><option>Non-AC</option><option>Confirm with owner</option></select></label><label>Price per night (₹)<input type="number" min="0" value={roomDraft.price ?? ''} onChange={e=>setRoomDraft({...roomDraft,price:e.target.value})} placeholder="Leave blank to show enquiry"/></label><label>Availability<select value={String(roomDraft.is_available)} onChange={e=>setRoomDraft({...roomDraft,is_available:e.target.value==='true'})}><option value="true">Enquire with owner</option><option value="false">Unavailable</option></select></label></div><label>Description<textarea value={roomDraft.description} onChange={e=>setRoomDraft({...roomDraft,description:e.target.value})}/></label><label>Room photo<input type="file" accept="image/*" onChange={e=>uploadImage(e.target.files?.[0],url=>setRoomDraft(d=>({...d,image_url:url})))}/></label>{roomDraft.image_url && <img className="admin-preview" src={roomDraft.image_url} alt="Room preview"/>}<div className="admin-actions"><button className="button button-navy">Save room</button><button type="button" className="button button-light" onClick={()=>setRoomDraft(null)}>Cancel</button></div></form>}
            {rooms.map(r=><div className="manage-row" key={r.id}><Photo src={r.image_url} alt={r.name}/><div><b>{r.name}</b><small>{r.ac_type} · {r.price?`₹${r.price}`:'Price on enquiry'}</small></div><button onClick={()=>setRoomDraft({...r,price:r.price??''})}>Edit</button><button className="danger" onClick={()=>deleteRoom(r)}>Remove</button></div>)}</>}
          {tab==='facilities' && <><h3>Facilities & Services</h3><form className="inline-add" onSubmit={addFacility}><input value={facilityDraft} onChange={e=>setFacilityDraft(e.target.value)} placeholder="Add a verified facility"/><button className="button button-navy">Add</button></form>{facilities.map(f=><div className="manage-row simple" key={f}><span>{f}</span><button className="danger" onClick={()=>removeFacility(f)}>Remove</button></div>)}</>}
          {tab==='enquiries' && <><div className="admin-title-row"><h3>Booking Enquiries</h3><button className="button button-light button-small" onClick={refreshEnquiries}>Refresh</button></div>{enquiries.length===0?<p>No enquiries received yet.</p>:enquiries.map(q=><div className="enquiry-card" key={q.id}><div className="admin-title-row"><b>{q.guest_name}</b><span>{new Date(q.created_at).toLocaleString()}</span></div><p>Phone: <a href={`tel:${q.phone}`}>{q.phone}</a> · {q.guests} guest(s) · {q.room_type}</p><p>Dates: {q.check_in||'Not specified'} to {q.check_out||'Not specified'}</p>{q.message&&<p>{q.message}</p>}<div className="enquiry-actions"><select value={q.status||'New'} onChange={e=>updateEnquiryStatus(q.id,e.target.value)}><option>New</option><option>Contacted</option><option>Confirmed</option><option>Closed</option></select><a href={whatsappLink(settings.whatsapp||settings.phone,`Hello ${q.guest_name}, regarding your room enquiry.`)} target="_blank" rel="noreferrer">WhatsApp guest</a></div></div>)}</>}
          {tab==='attractions' && <><h3>Nearby Places</h3><form className="editor-form" onSubmit={saveAttraction}><label>Place name<input required value={attractionDraft.title} onChange={e=>setAttractionDraft({...attractionDraft,title:e.target.value})}/></label><label>Caption<textarea required value={attractionDraft.caption} onChange={e=>setAttractionDraft({...attractionDraft,caption:e.target.value})}/></label><label>Photo<input type="file" accept="image/*" onChange={e=>uploadImage(e.target.files?.[0],url=>setAttractionDraft(d=>({...d,image_url:url})))}/></label><button className="button button-navy">Add place</button></form>{attractions.map(a=><div className="manage-row simple" key={a.id}><span><b>{a.title}</b><small>{a.caption}</small></span></div>)}</>}
          {tab==='settings' && <><h3>Website Details</h3><form className="editor-form" onSubmit={saveSettings}>{[['business_name','Business name'],['business_subtitle','Business subtitle'],['tagline','Tagline'],['hero_title','Homepage headline'],['hero_text','Homepage description'],['phone','Phone number'],['whatsapp','WhatsApp number'],['email','Email'],['address','Full address'],['map_url','Google Maps link'],['owner_intro','Owner introduction'],['hero_image','Homepage banner image URL']].map(([key,label])=><label key={key}>{label}{['hero_text','address','owner_intro'].includes(key)?<textarea value={settingsDraft[key]||''} onChange={e=>setSettingsDraft({...settingsDraft,[key]:e.target.value})}/>:<input value={settingsDraft[key]||''} onChange={e=>setSettingsDraft({...settingsDraft,[key]:e.target.value})}/>}</label>)}<button className="button button-navy">Save website details</button></form></>}
        </div>
      </>}
    </div></div>}
  </div>;
}