import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/shared/lib/supabaseClient";
import { signOut } from "@/shared/lib/auth";
import toast from "react-hot-toast";
import type { Profile } from "@/shared/types";

interface UseSettingsReturn {
  // State
  loading: boolean;
  session: any | null;
  profile: Profile | null;
  // Profile form
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string;
  thumbnailUrl: string;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  setDisplayName: (v: string) => void;
  setPhone: (v: string) => void;
  savingProfile: boolean;
  handleSaveProfile: () => Promise<void>;
  // Thumbnail
  uploadingThumbnail: boolean;
  handleThumbnailUpload: (file: File) => Promise<void>;
  handleRemoveThumbnail: () => Promise<void>;
  // Security
  newPassword: string;
  confirmPassword: string;
  setNewPassword: (v: string) => void;
  setConfirmPassword: (v: string) => void;
  savingPassword: boolean;
  handleChangePassword: () => Promise<void>;
  // Language
  currentLanguage: string;
  handleChangeLanguage: (lang: string) => void;
  // Role request
  requestedRole: string;
  setRequestedRole: (v: string) => void;
  requestingRole: boolean;
  handleRequestRole: () => Promise<void>;
  handleCancelRoleRequest: () => Promise<void>;
  // Account
  handleSignOut: () => Promise<void>;
  // i18n
  t: (key: string, opts?: any) => string;
}

export function useSettings(): UseSettingsReturn {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const initRef = useRef(false);

  // Profile form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Thumbnail
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // Security
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Language
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || "es");

  // Role request
  const [requestedRole, setRequestedRole] = useState("");
  const [requestingRole, setRequestingRole] = useState(false);

  // ── Load session & profile ──
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        setSession(s);
        if (s?.user?.id) {
          const { data: p } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", s.user.id)
            .single();
          if (p) {
            setProfile(p as Profile);
            setFirstName(p.first_name || "");
            setLastName(p.last_name || "");
            setDisplayName(p.display_name || "");
            setPhone(p.phone || "");
            setThumbnailUrl(p.thumbnail_url || "");
            if (p.role_requested) {
              setRequestedRole(p.role_requested);
            }
          }
        }
      } catch (err) {
        console.error("[Settings] init error", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Profile ──
  const handleSaveProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          display_name: displayName.trim() || null,
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);

      if (error) throw error;

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              first_name: firstName.trim() || null,
              last_name: lastName.trim() || null,
              display_name: displayName.trim() || null,
              phone: phone.trim() || null,
            }
          : prev
      );
      toast.success(t("settingsPage.profile.saveSuccess"));
    } catch (err: any) {
      console.error("[Settings] save profile error", err);
      toast.error(t("settingsPage.profile.saveError"));
    } finally {
      setSavingProfile(false);
    }
  }, [session, firstName, lastName, displayName, phone, t]);

  // ── Thumbnail upload ──
  const handleThumbnailUpload = useCallback(
    async (file: File) => {
      if (!session?.user?.id) return;
      setUploadingThumbnail(true);
      try {
        const ext = file.name.split(".").pop();
        const path = `avatars/${session.user.id}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("profiles")
          .upload(path, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("profiles")
          .getPublicUrl(path);

        const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ thumbnail_url: publicUrl, updated_at: new Date().toISOString() })
          .eq("id", session.user.id);

        if (updateError) throw updateError;

        setThumbnailUrl(publicUrl);
        setProfile((prev) => (prev ? { ...prev, thumbnail_url: publicUrl } : prev));
        toast.success(t("settingsPage.profile.saveSuccess"));
      } catch (err: any) {
        console.error("[Settings] thumbnail upload error", err);
        toast.error(t("settingsPage.profile.saveError"));
      } finally {
        setUploadingThumbnail(false);
      }
    },
    [session, t]
  );

  const handleRemoveThumbnail = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      await supabase
        .from("profiles")
        .update({ thumbnail_url: null, updated_at: new Date().toISOString() })
        .eq("id", session.user.id);

      setThumbnailUrl("");
      setProfile((prev) => (prev ? { ...prev, thumbnail_url: null } : prev));
    } catch (err) {
      console.error("[Settings] remove thumbnail error", err);
    }
  }, [session]);

  // ── Security ──
  const handleChangePassword = useCallback(async () => {
    if (newPassword.length < 6) {
      toast.error(t("settingsPage.security.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("settingsPage.security.passwordMismatch"));
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(t("settingsPage.security.passwordSuccess"));
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("[Settings] change password error", err);
      toast.error(t("settingsPage.security.passwordError"));
    } finally {
      setSavingPassword(false);
    }
  }, [newPassword, confirmPassword, t]);

  // ── Language ──
  const handleChangeLanguage = useCallback(
    (lang: string) => {
      i18n.changeLanguage(lang);
      setCurrentLanguage(lang);
      toast.success(t("settingsPage.language.changeSuccess"));
    },
    [i18n, t]
  );

  // ── Role request ──
  const handleRequestRole = useCallback(async () => {
    if (!session?.user?.id || !requestedRole) return;
    if (profile?.role_requested) {
      toast.error(t("settingsPage.roleRequest.alreadyRequested"));
      return;
    }
    setRequestingRole(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role_requested: requestedRole, updated_at: new Date().toISOString() })
        .eq("id", session.user.id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, role_requested: requestedRole } : prev));
      toast.success(t("settingsPage.roleRequest.requestSuccess"));
    } catch (err: any) {
      console.error("[Settings] role request error", err);
      toast.error(t("settingsPage.roleRequest.requestError"));
    } finally {
      setRequestingRole(false);
    }
  }, [session, requestedRole, profile, t]);

  const handleCancelRoleRequest = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role_requested: null, updated_at: new Date().toISOString() })
        .eq("id", session.user.id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, role_requested: null } : prev));
      setRequestedRole("");
      toast.success(t("settingsPage.roleRequest.cancelSuccess"));
    } catch (err: any) {
      console.error("[Settings] cancel role request error", err);
    }
  }, [session, t]);

  // ── Sign out ──
  const handleSignOut = useCallback(async () => {
    await signOut(navigate, t);
  }, [navigate, t]);

  return {
    loading,
    session,
    profile,
    firstName,
    lastName,
    displayName,
    phone,
    thumbnailUrl,
    setFirstName,
    setLastName,
    setDisplayName,
    setPhone,
    savingProfile,
    handleSaveProfile,
    uploadingThumbnail,
    handleThumbnailUpload,
    handleRemoveThumbnail,
    newPassword,
    confirmPassword,
    setNewPassword,
    setConfirmPassword,
    savingPassword,
    handleChangePassword,
    currentLanguage,
    handleChangeLanguage,
    requestedRole,
    setRequestedRole,
    requestingRole,
    handleRequestRole,
    handleCancelRoleRequest,
    handleSignOut,
    t,
  };
}
