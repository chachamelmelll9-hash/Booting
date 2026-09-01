import { useAuthStore } from '@features/auth';
import {
  type DraftErrors,
  hasErrors,
  MockAlbumSheet,
  pickImage,
  RegionPicker,
  type SampleImage,
  uploadToStorage,
  useParentProfile,
  useParentProfileMutations,
  useProfileDraftStore,
  validateBasics,
  validateDetails,
  validateIntro,
} from '@features/parent-profile';
import { theme } from '@shared/config/colors';
import {
  LIVING_WITH_OPTIONS,
  MIN_PROFILE_PHOTOS,
  parseLivingWith,
  serializeLivingWith,
  SMOKING_OPTIONS,
} from '@shared/config/profileOptions';
import { HIT_SIZE, radius, spacing, typography } from '@shared/config/tokens';
import {
  AppButton,
  FormSection,
  PhotoUploader,
  RelationshipGoalChips,
  Screen,
  StepProgressBar,
  TextField,
  useToast,
} from '@shared/ui';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * 3단계 — 프로필 작성.
 *
 * 6개 섹션을 한 스크롤에 둔다. 섹션마다 화면을 나누면 5단계 플로우 안에
 * 또 6단계가 생겨서 어디까지 왔는지 알 수 없어진다. 대신 draft 스토어가
 * 입력을 들고 있어 화면을 벗어났다 와도 남아 있다.
 */
export default function ProfileEditScreen() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const { draft, set } = useProfileDraftStore();
  const { data: profile } = useParentProfile();
  const { create, update, addPhoto, removePhoto } = useParentProfileMutations();

  const [errors, setErrors] = useState<DraftErrors>({});
  const [regionOpen, setRegionOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [albumOpen, setAlbumOpen] = useState(false);

  const addPhotoFrom = async (sample: SampleImage) => {
    setAlbumOpen(false);
    if (!user?.id) return;
    try {
      setUploading(true);
      // 기본 정보가 유효하면 프로필을 먼저 만든다 (사진은 프로필에 딸린 자원)
      const target = await ensureProfile();
      if (!target) return;
      const image = await pickImage(sample);
      if (!image) return;
      const path = await uploadToStorage('parent-photos', user.id, image);
      addPhoto.mutate({
        storagePath: path,
        isPrimary: (target.photos?.length ?? 0) === 0,
      });
    } catch (error) {
      toast.show({ message: (error as Error).message });
    } finally {
      setUploading(false);
    }
  };

  // 이미 만든 프로필이 있으면 draft 를 서버 값으로 채운다 (재진입·수정)
  useEffect(() => {
    if (!profile) return;
    set({
      displayName: profile.displayName,
      gender: profile.gender,
      birthDate: profile.birthDate,
      regionCode: profile.regionCode,
      regionLabel: profile.region,
      maritalStatus: profile.maritalStatus,
      maritalSince: profile.maritalSince ?? '',
      goals: profile.goals,
      childrenCount: profile.childrenCount ?? '',
      livingWith: parseLivingWith(profile.livingWith),
      religion: profile.religion ?? '',
      occupation: profile.occupation ?? '',
      drinking: profile.drinking ?? '',
      smoking: profile.smoking ?? '',
      hobbies: profile.hobbies.join(', '),
      motto: profile.motto ?? '',
      introByChild: profile.introByChild ?? '',
      desiredPartner: profile.desiredPartner ?? '',
      parentMessage: profile.parentMessage ?? '',
    });
    // profile 이 바뀔 때만 — set 은 안정적인 zustand 액션이다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  /**
   * 프로필 행을 확보한다.
   *
   * 사진은 프로필에 딸린 자원이라 프로필이 있어야 올릴 수 있는데, 사진이
   * 필수라 저장도 사진 없이는 통과하지 못한다 — 그대로 두면 서로를 기다리는
   * 교착이 된다. 그래서 사진을 처음 추가할 때 기본 정보만으로 프로필을
   * 조용히 만들어 둔다 (사용자에게 "먼저 저장하세요"를 요구하지 않는다).
   */
  const ensureProfile = async () => {
    if (profile) return profile;

    const basicErrors = validateBasics(draft);
    setErrors(basicErrors);
    if (hasErrors(basicErrors)) {
      toast.show({ message: '사진을 올리려면 기본 정보를 먼저 입력해주세요' });
      return null;
    }

    return create.mutateAsync({
      displayName: draft.displayName.trim(),
      gender: draft.gender as 'male' | 'female',
      birthDate: draft.birthDate,
      regionCode: draft.regionCode,
      maritalStatus: draft.maritalStatus as 'bereaved' | 'divorced',
      maritalSince: draft.maritalSince || undefined,
      goals: draft.goals,
    });
  };

  const save = async () => {
    const all = {
      ...validateBasics(draft),
      ...validateDetails(draft),
      ...validateIntro(draft),
    };
    setErrors(all);
    if (hasErrors(all)) {
      toast.show({ message: '입력하지 않은 항목이 있습니다' });
      return;
    }
    if ((profile?.photos.length ?? 0) < MIN_PROFILE_PHOTOS) {
      toast.show({ message: `사진을 최소 ${MIN_PROFILE_PHOTOS}장 등록해주세요` });
      return;
    }

    const details = {
      childrenCount: draft.childrenCount || undefined,
      livingWith: serializeLivingWith(draft.livingWith) || undefined,
      religion: draft.religion || undefined,
      occupation: draft.occupation || undefined,
      drinking: draft.drinking || undefined,
      smoking: draft.smoking || undefined,
      hobbies: draft.hobbies
        ? draft.hobbies.split(',').map((h) => h.trim()).filter(Boolean)
        : undefined,
      motto: draft.motto || undefined,
      introByChild: draft.introByChild,
      desiredPartner: draft.desiredPartner,
      parentMessage: draft.parentMessage || undefined,
      goals: draft.goals,
    };

    try {
      if (!profile) {
        await create.mutateAsync({
          displayName: draft.displayName.trim(),
          gender: draft.gender as 'male' | 'female',
          birthDate: draft.birthDate,
          regionCode: draft.regionCode,
          maritalStatus: draft.maritalStatus as 'bereaved' | 'divorced',
          maritalSince: draft.maritalSince || undefined,
          goals: draft.goals,
        });
      }
      await update.mutateAsync({
        displayName: draft.displayName.trim(),
        regionCode: draft.regionCode,
        maritalSince: draft.maritalSince || undefined,
        ...details,
      });
      router.push('/(parent-setup)/consent');
    } catch (error) {
      toast.show({ message: (error as Error).message });
    }
  };

  return (
    <Screen
      scroll
      footer={
        <AppButton
          label="저장하고 다음"
          loading={create.isPending || update.isPending}
          testID="profile-save"
          onPress={save}
        />
      }
    >
      <StepProgressBar current={3} total={5} label="프로필 작성" />

      <Text style={styles.section}>기본 정보</Text>

      <FormSection label="부모님 성함" required helper="상대에게는 김OO 형태로만 보입니다" error={errors.displayName}>
        <TextField
          testID="profile-name"
          value={draft.displayName}
          onChangeText={(v) => set({ displayName: v })}
          placeholder="예: 김철수"
          maxLength={20}
          invalid={!!errors.displayName}
        />
      </FormSection>

      <FormSection label="성별" required error={errors.gender}>
        <View style={styles.row}>
          {(
            [
              { key: 'male' as const, label: '남성' },
              { key: 'female' as const, label: '여성' },
            ]
          ).map((option) => (
            <Chip
              key={option.key}
              label={option.label}
              selected={draft.gender === option.key}
              onPress={() => set({ gender: option.key })}
              testID={`gender-${option.key}`}
            />
          ))}
        </View>
      </FormSection>

      <FormSection label="생년월일" required helper="만 50세 이상만 등록하실 수 있습니다" error={errors.birthDate}>
        <TextField
          testID="profile-birth"
          value={draft.birthDate}
          onChangeText={(v) => set({ birthDate: v })}
          placeholder="1958-04-11"
          invalid={!!errors.birthDate}
        />
      </FormSection>

      <FormSection label="거주 지역" required helper="시·군·구까지만 공개됩니다" error={errors.regionCode}>
        <Pressable
          testID="profile-region"
          accessibilityRole="button"
          accessibilityLabel="거주 지역 선택"
          onPress={() => setRegionOpen(true)}
          style={({ pressed }) => [styles.select, pressed && styles.pressed]}
        >
          <Text style={draft.regionLabel ? styles.selectValue : styles.selectPlaceholder}>
            {draft.regionLabel || '지역을 선택해주세요'}
          </Text>
        </Pressable>
      </FormSection>

      <FormSection label="관계 목적" required helper="최대 2개까지 선택하실 수 있습니다" error={errors.goals}>
        <RelationshipGoalChips
          goals={draft.goals}
          mode="select"
          onChange={(goals) => set({ goals })}
          onRejected={(reason) => toast.show({ message: reason })}
        />
        {/* 동성 친구는 추천 결과가 통째로 달라지므로 고른 즉시 알려준다 */}
        {draft.goals.includes('same_sex_friend') ? (
          <Text style={styles.goalNotice} testID="same-sex-notice">
            동성 친구를 선택하시면 같은 성별의 동성 친구를 찾는 분만 추천됩니다.
          </Text>
        ) : null}
      </FormSection>

      <Text style={styles.section}>사진 (필수)</Text>
      {(profile?.photos.length ?? 0) < MIN_PROFILE_PHOTOS ? (
        <Text style={styles.requiredNote}>
          사진을 최소 {MIN_PROFILE_PHOTOS}장 등록해주세요 (현재{' '}
          {profile?.photos.length ?? 0}장)
        </Text>
      ) : null}
      <PhotoUploader
        photos={profile?.photos ?? []}
        busy={uploading || addPhoto.isPending}
        onAdd={() => setAlbumOpen(true)}
        onRemove={(photoId) => removePhoto.mutate(photoId)}
      />

      <Text style={styles.section}>가족·생활</Text>
      <Text style={styles.sectionNote}>
        모두 필수 항목입니다. 자녀 수와 동거 가족은 검색 조건으로 쓰이지 않고 상세
        화면에서만 보입니다.
      </Text>

      <FormSection label="자녀 수" required error={errors.childrenCount}>
        <TextField
          testID="profile-children"
          value={draft.childrenCount}
          onChangeText={(v) => set({ childrenCount: v })}
          placeholder="예: 2명"
          maxLength={20}
          invalid={!!errors.childrenCount}
        />
      </FormSection>
      <FormSection
        label="동거 가족"
        required
        helper="해당하는 항목을 모두 선택해주세요"
        error={errors.livingWith}
      >
        <View style={styles.row}>
          {LIVING_WITH_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={draft.livingWith.includes(option)}
              testID={`living-${option}`}
              onPress={() =>
                set({
                  livingWith: draft.livingWith.includes(option)
                    ? draft.livingWith.filter((v) => v !== option)
                    : [...draft.livingWith, option],
                })
              }
            />
          ))}
        </View>
      </FormSection>
      <FormSection label="종교" required error={errors.religion}>
        <TextField
          value={draft.religion}
          onChangeText={(v) => set({ religion: v })}
          placeholder="예: 무교"
          maxLength={30}
          invalid={!!errors.religion}
        />
      </FormSection>
      <FormSection label="직업 / 은퇴 전 직업" required error={errors.occupation}>
        <TextField
          value={draft.occupation}
          onChangeText={(v) => set({ occupation: v })}
          placeholder="예: 은퇴 (교사)"
          maxLength={50}
          invalid={!!errors.occupation}
        />
      </FormSection>
      <FormSection label="음주" required error={errors.drinking}>
        <TextField
          value={draft.drinking}
          onChangeText={(v) => set({ drinking: v })}
          placeholder="예: 가끔"
          maxLength={20}
          invalid={!!errors.drinking}
        />
      </FormSection>
      <FormSection label="흡연" required error={errors.smoking}>
        <View style={styles.row}>
          {SMOKING_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={draft.smoking === option}
              testID={`smoking-${option}`}
              onPress={() => set({ smoking: option })}
            />
          ))}
        </View>
      </FormSection>
      <FormSection label="취미" required helper="쉼표로 구분해주세요" error={errors.hobbies}>
        <TextField
          value={draft.hobbies}
          onChangeText={(v) => set({ hobbies: v })}
          placeholder="예: 산책, 바둑, 등산"
          invalid={!!errors.hobbies}
        />
      </FormSection>

      <Text style={styles.section}>소개</Text>

      <FormSection label="부모님은 어떤 분이신가요" required error={errors.introByChild}>
        <TextField
          testID="profile-intro"
          value={draft.introByChild}
          onChangeText={(v) => set({ introByChild: v })}
          placeholder="자녀분이 보시는 부모님을 편하게 적어주세요"
          multiline
          maxLength={1000}
          invalid={!!errors.introByChild}
        />
      </FormSection>

      <FormSection label="어떤 분을 만나고 싶으신가요" required error={errors.desiredPartner}>
        <TextField
          testID="profile-desired"
          value={draft.desiredPartner}
          onChangeText={(v) => set({ desiredPartner: v })}
          placeholder="예: 대화가 잘 통하는 분"
          multiline
          maxLength={500}
          invalid={!!errors.desiredPartner}
        />
      </FormSection>

      <FormSection label="부모님이 직접 전하고 싶은 말" helper="선택 사항입니다">
        <TextField
          value={draft.parentMessage}
          onChangeText={(v) => set({ parentMessage: v })}
          placeholder="부모님께 여쭤보고 그대로 적어주세요"
          multiline
          maxLength={500}
        />
      </FormSection>

      <MockAlbumSheet
        visible={albumOpen}
        title="앨범에서 사진 선택"
        onSelect={(sample) => void addPhotoFrom(sample)}
        onDismiss={() => setAlbumOpen(false)}
      />

      <RegionPicker
        visible={regionOpen}
        onDismiss={() => setRegionOpen(false)}
        onSelect={(region) => {
          set({ regionCode: region.code, regionLabel: region.label });
          setRegionOpen(false);
        }}
      />
    </Screen>
  );
}

function Chip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    ...typography.heading,
    color: theme.colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionNote: {
    ...typography.caption,
    color: theme.colors.textTertiary,
    marginBottom: spacing.sm,
  },
  requiredNote: {
    ...typography.caption,
    color: theme.colors.error,
    marginBottom: spacing.xs,
  },
  goalNotice: {
    ...typography.caption,
    color: theme.colors.primaryDark,
    backgroundColor: theme.colors.primarySurface,
    padding: spacing.xs,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  row: { flexDirection: 'row', gap: spacing.xs },
  chip: {
    minHeight: HIT_SIZE,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySurface },
  chipText: { ...typography.body, color: theme.colors.textSecondary },
  chipTextSelected: { color: theme.colors.primaryDark, fontWeight: '600' },
  select: {
    minHeight: HIT_SIZE + 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  selectValue: { ...typography.body, color: theme.colors.text },
  selectPlaceholder: { ...typography.body, color: theme.colors.placeholder },
  pressed: { opacity: 0.85 },
});
