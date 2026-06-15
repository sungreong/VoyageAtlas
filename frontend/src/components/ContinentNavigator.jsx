import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Compass, LocateFixed, Navigation, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import apiClient from '../api/client';
import './ContinentNavigator.css';

const CONTINENT_TARGETS = [
  { id: 'asia', label: 'Asia', ko: '아시아', lat: 34, lng: 100, tone: 'emerald' },
  { id: 'europe', label: 'Europe', ko: '유럽', lat: 52, lng: 15, tone: 'gold' },
  { id: 'africa', label: 'Africa', ko: '아프리카', lat: 3, lng: 20, tone: 'sun' },
  { id: 'north-america', label: 'N. America', ko: '북미', lat: 44, lng: -102, tone: 'cyan' },
  { id: 'south-america', label: 'S. America', ko: '남미', lat: -16, lng: -60, tone: 'rose' },
  { id: 'oceania', label: 'Oceania', ko: '오세아니아', lat: -25, lng: 135, tone: 'violet' }
];

const EMPTY_DRAFT = {
  name: '',
  lat: '',
  lng: ''
};

const getNearestLongitude = (targetLng, referenceLng) => {
  if (!Number.isFinite(referenceLng)) return targetLng;

  let nearest = targetLng;
  while (nearest - referenceLng > 180) nearest -= 360;
  while (nearest - referenceLng < -180) nearest += 360;
  return nearest;
};

const normalizeCoordinate = (value, min, max) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) return null;
  return numeric;
};

const formatCoord = (value) => Number(value).toFixed(3);

const getFavoriteName = (favorite) => {
  const parts = [favorite?.city, favorite?.region, favorite?.country].filter(Boolean);
  return favorite?.name || parts.join(', ') || '저장 위치';
};

const getLocationMeta = (favorite) => {
  const parts = [favorite?.city, favorite?.region, favorite?.country].filter(Boolean);
  return parts.length ? parts.join(' / ') : `${formatCoord(favorite.lat)}, ${formatCoord(favorite.lng)}`;
};

const ContinentNavigator = ({ referenceLng, suggestedFavorite, onSuggestedFavoriteDone, onNavigate }) => {
  const [activeTargetId, setActiveTargetId] = useState('');
  const [collapsed, setCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState('continents');
  const [favorites, setFavorites] = useState([]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [favoriteError, setFavoriteError] = useState('');
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoriteSaving, setFavoriteSaving] = useState(false);
  const [editingFavoriteId, setEditingFavoriteId] = useState(null);
  const [pendingSuggestion, setPendingSuggestion] = useState(null);
  const lastLongitudeRef = useRef(null);
  const activeTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(activeTimerRef.current), []);

  useEffect(() => {
    let cancelled = false;
    const fetchFavorites = async () => {
      setFavoritesLoading(true);
      try {
        const { data } = await apiClient.get('/location-favorites/');
        if (!cancelled) setFavorites(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setFavoriteError('즐겨찾기를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setFavoritesLoading(false);
      }
    };

    fetchFavorites();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!suggestedFavorite) return;

    const lat = normalizeCoordinate(suggestedFavorite.lat, -90, 90);
    const lng = normalizeCoordinate(suggestedFavorite.lng, -180, 180);
    if (lat === null || lng === null) return;

    setCollapsed(false);
    setActiveTab('favorites');
    setPendingSuggestion({ ...suggestedFavorite, lat, lng });
    setEditingFavoriteId(null);
    setDraft({
      name: String(suggestedFavorite.name || `선택 위치 ${formatCoord(lat)}, ${formatCoord(lng)}`),
      lat: lat.toFixed(4),
      lng: lng.toFixed(4)
    });
    setFavoriteError('');
  }, [suggestedFavorite]);

  const handleNavigate = (target, type = 'continent') => {
    const reference = lastLongitudeRef.current ?? Number(referenceLng);
    const lng = getNearestLongitude(target.lng, reference);
    lastLongitudeRef.current = lng;
    setActiveTargetId(`${type}:${target.id}`);
    clearTimeout(activeTimerRef.current);
    activeTimerRef.current = setTimeout(() => setActiveTargetId(''), 1800);
    onNavigate?.({
      lat: target.lat,
      lng,
      altitude: target.altitude || (target.id === 'oceania' ? 1.42 : 1.34),
      duration: target.duration || 1450
    });
  };

  const handleDraftChange = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }));
    if (favoriteError) setFavoriteError('');
  };

  const handleAddFavorite = async (event) => {
    event.preventDefault();
    if (favoriteSaving || pendingSuggestion?.resolving) return;

    const lat = normalizeCoordinate(draft.lat, -90, 90);
    const lng = normalizeCoordinate(draft.lng, -180, 180);
    const name = draft.name.trim();

    if (lat === null || lng === null) {
      setFavoriteError('위도는 -90~90, 경도는 -180~180 사이로 입력하세요.');
      return;
    }

    const signature = `${lat.toFixed(4)}:${lng.toFixed(4)}`;
    const alreadySaved = favorites.some(favorite => (
      favorite.id !== editingFavoriteId &&
      `${Number(favorite.lat).toFixed(4)}:${Number(favorite.lng).toFixed(4)}` === signature
    ));
    if (alreadySaved) {
      setFavoriteError('이미 저장된 좌표입니다.');
      return;
    }

    setFavoriteSaving(true);
    try {
      const payload = {
        lat,
        lng,
        name: name || pendingSuggestion?.name || `선택 위치 ${formatCoord(lat)}, ${formatCoord(lng)}`
      };

      if (editingFavoriteId) {
        const { data } = await apiClient.patch(`/location-favorites/${editingFavoriteId}`, payload);
        setFavorites(prev => prev.map(favorite => favorite.id === editingFavoriteId ? data : favorite));
      } else {
        Object.assign(payload, {
          city: pendingSuggestion?.city || null,
          region: pendingSuggestion?.region || null,
          country: pendingSuggestion?.country || null,
          display_name: pendingSuggestion?.display_name || null,
          source: pendingSuggestion?.source || null
        });
        const { data } = await apiClient.post('/location-favorites/', payload);
        setFavorites(prev => [data, ...prev]);
      }

      setDraft(EMPTY_DRAFT);
      setPendingSuggestion(null);
      setEditingFavoriteId(null);
      setFavoriteError('');
      onSuggestedFavoriteDone?.();
    } catch (error) {
      const detail = error.response?.data?.detail;
      setFavoriteError(detail || '즐겨찾기를 저장하지 못했습니다.');
    } finally {
      setFavoriteSaving(false);
    }
  };

  const handleEditFavorite = (favorite) => {
    setEditingFavoriteId(favorite.id);
    setPendingSuggestion(null);
    setDraft({
      name: getFavoriteName(favorite),
      lat: Number(favorite.lat).toFixed(4),
      lng: Number(favorite.lng).toFixed(4)
    });
    setFavoriteError('');
  };

  const handleCancelEdit = () => {
    setEditingFavoriteId(null);
    setDraft(EMPTY_DRAFT);
    setFavoriteError('');
  };

  const handleRemoveFavorite = async (favoriteId) => {
    try {
      await apiClient.delete(`/location-favorites/${favoriteId}`);
      setFavorites(prev => prev.filter(favorite => favorite.id !== favoriteId));
      if (editingFavoriteId === favoriteId) handleCancelEdit();
    } catch {
      setFavoriteError('즐겨찾기를 삭제하지 못했습니다.');
    }
  };

  const handleDismissSuggestion = () => {
    setPendingSuggestion(null);
    setDraft(EMPTY_DRAFT);
    setFavoriteError('');
    setEditingFavoriteId(null);
    onSuggestedFavoriteDone?.();
  };

  return (
    <section className={`continent-navigator glass-panel hud-font ${collapsed ? 'collapsed' : 'expanded'}`} aria-label="Continent quick navigation">
      {!collapsed && (
        <div className="continent-nav-body">
          <div className="continent-nav-tabs" role="tablist" aria-label="Globe quick targets">
            <button
              type="button"
              className={activeTab === 'continents' ? 'active' : ''}
              onClick={() => setActiveTab('continents')}
              role="tab"
              aria-selected={activeTab === 'continents'}
            >
              <Compass size={13} />
              대륙
            </button>
            <button
              type="button"
              className={activeTab === 'favorites' ? 'active' : ''}
              onClick={() => setActiveTab('favorites')}
              role="tab"
              aria-selected={activeTab === 'favorites'}
            >
              <Star size={13} />
              즐겨찾기
              <small>{favorites.length}</small>
            </button>
          </div>

          {activeTab === 'continents' && (
            <div className="continent-nav-grid">
              {CONTINENT_TARGETS.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  className={`continent-jump ${target.tone} ${activeTargetId === `continent:${target.id}` ? 'active' : ''}`}
                  onClick={() => handleNavigate(target, 'continent')}
                  title={`${target.ko}로 지구본 이동`}
                >
                  <LocateFixed size={14} />
                  <span>{target.ko}</span>
                  <small>{target.label}</small>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="favorite-targets">
              <form className="favorite-target-form" onSubmit={handleAddFavorite}>
                {pendingSuggestion && (
                  <div className="favorite-suggestion">
                    <Star size={16} />
                    <div>
                      <strong>
                        {pendingSuggestion.resolving ? '가까운 위치를 찾는 중...' : getFavoriteName(pendingSuggestion)}
                      </strong>
                      <small>
                        {pendingSuggestion.resolving
                          ? `${formatCoord(pendingSuggestion.lat)}, ${formatCoord(pendingSuggestion.lng)}`
                          : getLocationMeta(pendingSuggestion)}
                      </small>
                    </div>
                    <div className="favorite-suggestion-actions">
                      <button
                        type="submit"
                        className="favorite-suggestion-save"
                        title="즐겨찾기로 저장"
                        disabled={favoriteSaving || pendingSuggestion.resolving}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        className="favorite-suggestion-dismiss"
                        onClick={handleDismissSuggestion}
                        title="취소"
                        disabled={favoriteSaving}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
                <input
                  value={draft.name}
                  onChange={(event) => handleDraftChange('name', event.target.value)}
                  placeholder="장소 이름"
                  aria-label="Favorite place name"
                />
                <div className={`favorite-coordinate-row ${editingFavoriteId ? 'editing' : ''}`}>
                  <input
                    value={draft.lat}
                    onChange={(event) => handleDraftChange('lat', event.target.value)}
                    placeholder="위도"
                    inputMode="decimal"
                    aria-label="Favorite latitude"
                  />
                  <input
                    value={draft.lng}
                    onChange={(event) => handleDraftChange('lng', event.target.value)}
                    placeholder="경도"
                    inputMode="decimal"
                    aria-label="Favorite longitude"
                  />
                  <button
                    type="submit"
                    className="favorite-save"
                    title={editingFavoriteId ? '즐겨찾기 수정' : '좌표 즐겨찾기 추가'}
                    disabled={favoriteSaving || pendingSuggestion?.resolving}
                  >
                    {editingFavoriteId ? <Check size={15} /> : <Plus size={15} />}
                  </button>
                  {editingFavoriteId && (
                    <button
                      type="button"
                      className="favorite-cancel-edit"
                      onClick={handleCancelEdit}
                      title="수정 취소"
                      disabled={favoriteSaving}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {favoriteError && <p className="favorite-error">{favoriteError}</p>}
              </form>

              <div className="favorite-target-list" aria-label="Saved globe locations">
                {favoritesLoading ? (
                  <div className="favorite-empty">
                    <Star size={16} />
                    <span>저장된 위치를 불러오는 중입니다.</span>
                  </div>
                ) : favorites.length === 0 ? (
                  <div className="favorite-empty">
                    <Star size={16} />
                    <span>저장한 위치가 없습니다.</span>
                  </div>
                ) : (
                  favorites.map((favorite) => (
                    <div
                      key={favorite.id}
                      className={`favorite-target ${editingFavoriteId === favorite.id ? 'editing' : ''} ${activeTargetId === `favorite:${favorite.id}` ? 'active' : ''}`}
                    >
                      <button
                        type="button"
                        className="favorite-target-main"
                        onClick={() => handleNavigate({ ...favorite, altitude: 1.18, duration: 1050 }, 'favorite')}
                        title={`${getFavoriteName(favorite)}로 지구본 이동`}
                      >
                        <Navigation size={14} />
                        <span>{getFavoriteName(favorite)}</span>
                        <small>{getLocationMeta(favorite)}</small>
                      </button>
                      <button
                        type="button"
                        className="favorite-edit"
                        onClick={() => handleEditFavorite(favorite)}
                        title={`${getFavoriteName(favorite)} 수정`}
                        aria-label={`${getFavoriteName(favorite)} 수정`}
                        disabled={favoriteSaving}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="favorite-remove"
                        onClick={() => handleRemoveFavorite(favorite.id)}
                        title={`${getFavoriteName(favorite)} 삭제`}
                        aria-label={`${getFavoriteName(favorite)} 삭제`}
                        disabled={favoriteSaving}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        className="continent-nav-header"
        onClick={() => setCollapsed(prev => !prev)}
        aria-expanded={!collapsed}
        title={collapsed ? '대륙 이동 펼치기' : '대륙 이동 접기'}
      >
        <span><Compass size={13} /> Continent jump</span>
        <strong>대륙 이동</strong>
        <ChevronDown size={15} className="continent-chevron" />
      </button>
    </section>
  );
};

export default ContinentNavigator;
