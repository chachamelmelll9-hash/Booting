import { useAuthStore } from '@features/auth';
import {
  type DraftErrors,
  hasErrors,
  pickImage,
  RegionPicker,
  uploadToStorage,
  useParentProfile,
  useParentProfileMutations,
  useProfileDraftStore,
  validateBasics,
  validateIntro,
} from '@features/parent-profile';
import { theme } from '@shared/config/colors';
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
      livingWith: profile.livingWith ?? '',
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

  const save = async () => {
    const basicErrors = validateBasics(draft);
    const introErrors = validateIntro(draft);
    const all = { ...basicErrors, ...introErrors };
    setErrors(all);
    if (hasErrors(all)) {
      toast.show({ message: '입력하지 않은 항목이 있습니다' });
      return;
    }

    const details = {
      childrenCount: draft.childrenCount || undefined,
      livingWith: draft.livingWith || undefined,
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
      </FormSection>

      <Text style={styles.section}>사진</Text>
      <PhotoUploader
        photos={profile?.photos ?? []}
        busy={uploading || addPhoto.isPending}
        onAdd={async () => {
          if (!profile) {
            toast.show({ message: '기본 정보를 먼저 저장해주세요' });
            return;
          }
          if (!user?.id) return;
          try {
            setUploading(true);
            const image = await pickImage();
            if (!image) return;
            const path = await uploadToStorage('parent-photos', user.id, image);
            addPhoto.mutate({ storagePath: path, isPrimary: (profile.photos?.length ?? 0) === 0 });
          } catch (error) {
            toast.show({ message: (error as Error).message });
          } finally {
            setUploading(false);
          }
        }}
        onRemove={(photoId) => removePhoto.mutate(photoId)}
      />

      <Text style={styles.section}>가족·생활</Text>
      <Text style={styles.sectionNote}>
        자녀 수와 동거 가족은 검색 조건으로 쓰이지 않고 상세 화면에서만 보입니다.
      </Text>

      <FormSection label="자녀 수">
        <TextField value={draft.childrenCount} onChangeText={(v) => set({ childrenCount: v })} placeholder="예: 2명" maxLength={20} />
      </FormSection>
      <FormSection label="동거 가족">
        <TextField value={draft.livingWith} onChangeText={(v) => set({ livingWith: v })} placeholder="예: 혼자 지내십니다" maxLength={50} />
      </FormSection>
      <FormSection label="종교">
        <TextField value={draft.religion} onChangeText={(v) => set({ religion: v })} placeholder="예: 무교" maxLength={30} />
      </FormSection>
      <FormSection label="직업 / 은퇴 전 직업">
        <TextField value={draft.occupation} onChangeText={(v) => set({ occupation: v })} placeholder="예: 은퇴 (교사)" maxLength={50} />
      </FormSection>
      <FormSection label="음주">
        <TextField value={draft.drinking} onChangeText={(v) => set({ drinking: v })} placeholder="예: 가끔" maxLength={20} />
      </FormSection>
      <FormSection label="흡연">
        <TextField value={draft.smoking} onChangeText={(v) => set({ smoking: v })} placeholder="예: 비흡연" maxLength={20} />
      </FormSection>
      <FormSection label="취미" helper="쉼표로 구분해주세요">
        <TextField value={draft.hobbies} onChangeText={(v) => set({ hobbies: v })} placeholder="예: 산책, 바둑, 등산" />
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
