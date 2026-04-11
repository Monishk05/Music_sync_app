import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// Replace this at the top of App.jsx
const socket = io.connect("https://music-sync-app-xzzx.onrender.com");

function App() {
  const [step, setStep] = useState(1); 
  const [isRegistering, setIsRegistering] = useState(false);
  const [user, setUser] = useState({ name: "", password: "" });
  const [room, setRoom] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [audioSrc, setAudioSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const [message, setMessage] = useState("");
  const audioRef = useRef(null);

  const [playlist, setPlaylist] = useState(() => {
    const saved = localStorage.getItem("my_songs");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("my_songs", JSON.stringify(playlist));
  }, [playlist]);

  useEffect(() => {
    socket.on("update_song", (url) => {
      setAudioSrc(url);
      if (url && step === 2) setStep(3);
    });

    socket.on("receive_message", (data) => {
      setChatLog((prev) => [...prev, data]);
    });

    socket.on("receive_control", (data) => {
      if (audioRef.current) {
        if (data.action === "play") audioRef.current.play().catch(() => {});
        else if (data.action === "pause") audioRef.current.pause();
        if (Math.abs(audioRef.current.currentTime - data.currentTime) > 1) {
          audioRef.current.currentTime = data.currentTime;
        }
      }
    });

    return () => {
      socket.off("update_song");
      socket.off("receive_message");
      socket.off("receive_control");
    };
  }, [step]);

  const handleJoin = (id) => {
    const finalId = (id || roomInput).toLowerCase().trim();
    if (finalId) {
      setRoom(finalId);
      socket.emit("join_room", finalId);
      setStep(3);
    }
  };

  const handleExitRoom = () => {
    if (window.confirm("Exit this room?")) {
      socket.emit("leave_room", room);
      setRoom("");
      setAudioSrc(null);
      setChatLog([]);
      setStep(2);
    }
  };

  const handleLogout = () => {
    setStep(1);
    setUser({ name: "", password: "" });
    setRoom("");
    setAudioSrc(null);
  };

  const emitControl = (action) => {
    if (audioRef.current && room) {
      socket.emit("send_control", { room, action, currentTime: audioRef.current.currentTime });
    }
  };

  const uploadToCloud = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "music_app_preset");

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dmtr8h0qb/auto/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.secure_url) {
        const newSong = { name: file.name, url: data.secure_url };
        setPlaylist(prev => [...prev, newSong]);
        socket.emit("change_song", { roomId: room, url: data.secure_url });
        setAudioSrc(data.secure_url);
      }
    } catch (err) { alert("Upload failed"); } finally { setLoading(false); }
  };

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("send_message", { room, author: user.name || "User", text: message });
      setMessage("");
    }
  };

  const styles = {
    container: { backgroundColor: '#121212', color: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', fontFamily: 'sans-serif' },
    card: { background: '#1e1e1e', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
    input: { width: '90%', padding: '12px', margin: '10px 0', borderRadius: '8px', border: 'none', background: '#2c2c2c', color: 'white' },
    btn: { width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#bb86fc', color: 'black', fontWeight: 'bold', cursor: 'pointer' },
    songItem: { background: '#252525', padding: '10px', margin: '8px 0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
  };

  return (
    <div style={styles.container}>
      
      {/* LOGIN / REGISTER */}
      {step === 1 && (
        <div style={styles.card}>
          <h2 style={{ marginBottom: '20px' }}>{isRegistering ? "Create Account" : "Welcome Back"}</h2>
          <input placeholder="Username" onChange={e => setUser({...user, name: e.target.value})} style={styles.input} />
          <input type="password" placeholder="Password" style={styles.input} />
          <button onClick={() => setStep(2)} style={styles.btn}>{isRegistering ? "Sign Up" : "Login"}</button>
          <p onClick={() => setIsRegistering(!isRegistering)} style={{color: '#bb86fc', cursor: 'pointer', marginTop: '15px', fontSize: '14px'}}>
            {isRegistering ? "Already have an account? Login" : "Don't have an account? Create one"}
          </p>
        </div>
      )}

      {/* LOBBY / ROOM SELECTION */}
      {step === 2 && (
        <div style={styles.card}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px'}}>
            <button onClick={() => setStep(4)} style={{background:'none', color:'white', border:'1px solid #444', padding:'5px 10px', borderRadius:'6px'}}>☰ Playlist</button>
            <button onClick={handleLogout} style={{background:'none', color:'#ff5252', border:'none', cursor:'pointer', fontWeight:'bold'}}>Logout</button>
          </div>
          <h3 style={{color: '#888'}}>Hello, {user.name}</h3>
          <button onClick={() => handleJoin(Math.random().toString(36).substring(7))} style={{...styles.btn, marginBottom: '15px'}}>Create Room</button>
          <div style={{margin: '10px 0', color: '#444'}}>OR</div>
          <input placeholder="Enter Room ID" onChange={e => setRoomInput(e.target.value)} style={styles.input} />
          <button onClick={() => handleJoin()} style={{...styles.btn, background:'#03dac6'}}>Join Room</button>
        </div>
      )}

      {/* SYNCED MUSIC ROOM */}
      {step === 3 && (
        <div style={styles.card}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
            <button onClick={handleExitRoom} style={{background:'#cf6679', color:'white', border:'none', padding:'5px 10px', borderRadius:'6px', fontSize:'12px'}}>Exit Room</button>
            <strong style={{color: '#bb86fc'}}>{room}</strong>
            <button onClick={() => setStep(4)} style={{background:'none', color:'white', border:'none'}}>Library</button>
          </div>

          {!audioSrc ? (
            <div style={{padding:'30px', border:'2px dashed #444', borderRadius: '10px'}}>
              {loading ? "Uploading..." : <input type="file" onChange={uploadToCloud} />}
            </div>
          ) : (
            <div style={{marginBottom:'15px'}}>
               <audio ref={audioRef} src={audioSrc} controls autoPlay style={{width:'100%'}}
                 onPlay={() => emitControl("play")} onPause={() => emitControl("pause")} onSeeked={() => emitControl("seek")}
               />
               <button onClick={() => socket.emit("remove_song", room)} style={{color:'#ff5252', background:'none', border:'none', cursor:'pointer', fontSize:'12px', marginTop:'5px'}}>Remove Song</button>
            </div>
          )}

          <div style={{height:'180px', overflowY:'auto', background:'#111', padding:'10px', borderRadius:'8px', textAlign:'left', border: '1px solid #333', fontSize:'14px'}}>
            {chatLog.map((m, i) => <div key={i} style={{marginBottom:'5px'}}><b style={{color: '#03dac6'}}>{m.author}:</b> {m.text}</div>)}
          </div>
          <div style={{display:'flex', gap:'5px', marginTop:'10px'}}>
            <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Message..." style={{...styles.input, margin: 0}} onKeyPress={e => e.key === 'Enter' && sendMessage()} />
            <button onClick={sendMessage} style={{width:'60px', background:'#bb86fc', border:'none', borderRadius:'6px', fontWeight:'bold'}}>Send</button>
          </div>
        </div>
      )}

      {/* PERSISTENT PLAYLIST */}
      {step === 4 && (
        <div style={styles.card}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
            <button onClick={() => setStep(room ? 3 : 2)} style={{background:'none', color:'white', border:'none'}}>← Back</button>
            <h2 style={{margin: 0, fontSize: '1.2rem'}}>My Playlist</h2>
          </div>
          <div style={{maxHeight: '400px', overflowY: 'auto'}}>
            {playlist.length === 0 ? <p style={{color: '#555'}}>Your playlist is empty.</p> : playlist.map((song, i) => (
              <div key={i} style={styles.songItem}>
                <span style={{fontSize:'12px', textAlign:'left', flex: 1, marginRight: '10px'}}>{song.name}</span>
                <div style={{display:'flex', gap:'5px'}}>
                  <button onClick={() => { 
                      setAudioSrc(song.url); 
                      socket.emit("change_song", { roomId: room, url: song.url }); 
                      setStep(3); 
                  }} style={{background:'#03dac6', border:'none', borderRadius:'4px', padding:'5px 10px'}}>Play</button>
                  <button onClick={() => setPlaylist(playlist.filter((_, idx) => idx !== i))} style={{background:'#cf6679', border:'none', borderRadius:'4px', padding:'5px 10px', color:'white'}}>X</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
