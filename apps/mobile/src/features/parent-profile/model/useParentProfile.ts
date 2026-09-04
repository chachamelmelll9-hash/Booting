import {
  bootingKeys,
  parentProfileApi,
  regionsApi,
  verificationApi,
} from '@shared/api/booting';
import type { ParentProfile } from '@shared/api/booting.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useVerification() {
  return useQuery({
    queryKey: bootingKeys.verification,
    queryFn: verificationApi.status,
  });
}

export function useParentProfile() {
  return useQuery({
    queryKey: bootingKeys.parentProfile,
    queryFn: parentProfileApi.get,
  });
}

export function useRegions() {
  return useQuery({
    queryKey: bootingKeys.regions,
    queryFn: regionsApi.list,
    // 229행 고정 참조 데이터 — 세션 내내 다시 받을 이유가 없다
    staleTime: Infinity,
  });
}

/**
 * 프로필 쓰기 동작 모음.
 *
 * 모든 뮤테이션이 같은 캐시 키를 무효화한다 — 프로필 상태(draft/review/published)와
 * 배지가 서로 얽혀 있어서, 하나만 갱신하면 화면이 반쯤 옛 상태로 남는다.
 */
export function useParentProfileMutations() {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: bootingKeys.parentProfile }),
      queryClient.invalidateQueries({ queryKey: bootingKeys.verification }),
      queryClient.invalidateQueries({ queryKey: bootingKeys.discovery }),
    ]);
  };

  const create = useMutation({
    mutationFn: parentProfileApi.create,
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: parentProfileApi.update,
    onSuccess: invalidate,
  });

  const addPhoto = useMutation({
    mutationFn: ({ storagePath, isPrimary }: { storagePath: string; isPrimary?: boolean }) =>
      parentProfileApi.addPhoto(storagePath, isPrimary),
    onSuccess: invalidate,
  });

  const removePhoto = useMutation({
    mutationFn: parentProfileApi.removePhoto,
    onSuccess: invalidate,
  });

  const createConsentLink = useMutation({
    mutationFn: parentProfileApi.createConsentLink,
    onSuccess: invalidate,
  });

  const revokeConsent = useMutation({
    mutationFn: parentProfileApi.revokeConsent,
    onSuccess: invalidate,
  });

  const submit = useMutation({
    mutationFn: parentProfileApi.submit,
    onSuccess: invalidate,
  });

  const setVisibility = useMutation({
    mutationFn: parentProfileApi.setVisibility,
    onSuccess: invalidate,
  });

  return {
    create,
    update,
    addPhoto,
    removePhoto,
    createConsentLink,
    revokeConsent,
    submit,
    setVisibility,
  };
}

export function useVerificationMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: bootingKeys.verification });

  return {
    submitPhone: useMutation({
      mutationFn: ({ phone, token }: { phone: string; token: string }) =>
        verificationApi.submitPhone(phone, token),
      onSuccess: invalidate,
    }),
    // submitFamilyDoc 은 없앴다 — 가족관계증명서는 더 이상 받지 않는다
  };
}

/** 등록 플로우가 지금 어느 단계에 있어야 하는지 — 화면이 직접 판정하지 않게 한다 */
export function nextSetupStep(
  verification: { phoneVerified: boolean } | undefined,
  profile: ParentProfile | null | undefined
): 'onboarding' | 'verification' | 'consent' | 'profile-edit' | 'preview' | 'done' {
  if (!verification) return 'onboarding';
  if (!verification.phoneVerified) return 'verification';
  if (!profile) return 'onboarding';
  // 내용 → 동의 → 공개 순. `missing` 은 서버가 계산해 내려준 값이라
  // 화면과 판정 기준이 어긋나지 않는다.
  if (profile.missing.some((key) => key !== 'consent')) return 'profile-edit';
  if (!profile.badges.consent) return 'consent';
  if (profile.status !== 'published') return 'preview';
  return 'done';
}
