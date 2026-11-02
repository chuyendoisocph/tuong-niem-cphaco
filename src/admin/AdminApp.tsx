import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { ExternalLink, LogOut } from "lucide-react";
import { signIn, signOut, useAdminPhotos, useStaffSession } from "@/admin/adminData";
import Dashboard from "@/admin/Dashboard";
import ProfileList from "@/admin/ProfileList";
import ProfileEditor from "@/admin/ProfileEditor";
import PendingPhotos from "@/admin/PendingPhotos";
import TributesAdmin from "@/admin/TributesAdmin";
import { SITE_NAME } from "@/lib/site";
import "@/styles/admin.css";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const { error: signInError } = await signIn(email.trim(), password);
    setPending(false);
    if (signInError) setError("Email hoặc mật khẩu chưa đúng.");
  }

  return <main className="admin-login">
    <form onSubmit={submit} className="admin-card">
      <img src="/cphaco-logo.png" alt="" width="56" height="56" />
      <h1>Quản trị nội dung</h1>
      <p>{SITE_NAME}. Đăng nhập bằng tài khoản nhân viên của Sổ Tang Điện Tử.</p>
      <label>Email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Mật khẩu<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <button className="admin-button" type="submit" disabled={pending}>{pending ? "Đang đăng nhập" : "Đăng nhập"}</button>
      <Link to="/" className="admin-link">Về trang tưởng niệm</Link>
    </form>
  </main>;
}

function AdminLayout({ email }: { email: string }) {
  const { data: pending = [] } = useAdminPhotos({ pending: true });
  return <div className="admin-shell">
    <header className="admin-header">
      <Link to="/quan-tri" className="admin-brand"><img src="/cphaco-logo.png" alt="" width="36" height="36" /><span>Quản trị · {SITE_NAME}</span></Link>
      <nav aria-label="Quản trị">
        <NavLink end to="/quan-tri">Tổng quan</NavLink>
        <NavLink to="/quan-tri/ho-so">Hồ sơ</NavLink>
        <NavLink to="/quan-tri/anh-cho-duyet">Ảnh chờ duyệt{pending.length > 0 && <span className="admin-badge">{pending.length}</span>}</NavLink>
        <NavLink to="/quan-tri/loi-tuong-nho">Lời tưởng nhớ</NavLink>
      </nav>
      <div className="admin-account">
        <a href="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={15} aria-hidden="true" />Xem trang</a>
        <span title={email}>{email}</span>
        <button type="button" onClick={() => void signOut()}><LogOut size={15} aria-hidden="true" />Đăng xuất</button>
      </div>
    </header>
    <main className="admin-main">
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="ho-so" element={<ProfileList />} />
        <Route path="ho-so/moi" element={<ProfileEditor />} />
        <Route path="ho-so/:id" element={<ProfileEditor />} />
        <Route path="anh-cho-duyet" element={<PendingPhotos />} />
        <Route path="loi-tuong-nho" element={<TributesAdmin />} />
      </Routes>
    </main>
  </div>;
}

export default function AdminApp() {
  const { session, isStaff, roleLoading } = useStaffSession();

  useEffect(() => {
    document.title = "Quản trị | " + SITE_NAME;
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  // Local development only: ?xem-thu shows the layout without signing in. Reads follow the public rules and writes are refused.
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("xem-thu")) return <AdminLayout email="xem thử (chưa đăng nhập)" />;
  if (session === undefined || (session && roleLoading)) return <main className="admin-login"><p>Đang tải…</p></main>;
  if (!session) return <LoginForm />;
  if (!isStaff) return <main className="admin-login"><div className="admin-card">
    <h1>Chưa có quyền</h1>
    <p>Tài khoản {session.user.email} chưa được cấp quyền quản trị. Nhờ quản trị viên thêm tài khoản này trong Sổ Tang Điện Tử.</p>
    <button className="admin-button" type="button" onClick={() => void signOut()}>Đăng xuất</button>
  </div></main>;
  return <AdminLayout email={session.user.email ?? ""} />;
}
