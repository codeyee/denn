import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Modal } from "@/components/common/modals/Modal";
import { Button } from "@/components/common/ui/Button";
import { Input } from "@/components/common/ui/Input";
import { UserAvatar } from "@/components/common/ui/UserAvatar";
import { useUpdatePublicProfileMutation } from "@/lib/api/mutations";
import type {
  ProfileBannerOption,
  PublicProfileIdentity,
} from "@/lib/types";
import { ProfileBannerPicker } from "./ProfileBannerPicker";
const editProfileSchema = z.object({
  bio: z.string().max(280, "Bio must be 280 characters or fewer."),
  avatar_url: z
    .string()
    .max(2048, "Avatar URL is too long.")
    .refine(
      (value) => !value || value.startsWith("https://"),
      "Use an HTTPS image URL.",
    ),
  banner_content_id: z.number().int().nullable(),
  banner_image_id: z.number().int().nullable(),
});
type EditProfileForm = z.infer<typeof editProfileSchema>;

interface EditProfileModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  profile: PublicProfileIdentity;
  bannerOptions: ProfileBannerOption[];
}

export function EditProfileModal({
  isOpen,
  onOpenChange,
  profile,
  bannerOptions,
}: EditProfileModalProps) {
  const mutation = useUpdatePublicProfileMutation();
  const form = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      banner_content_id: profile.banner_content_id,
      banner_image_id: profile.banner_image_id,
    },
  });
  const watchedBio = form.watch("bio");
  const watchedAvatar = form.watch("avatar_url");
  const watchedBannerContentId = form.watch("banner_content_id");
  const watchedBannerImageId = form.watch("banner_image_id");

  useEffect(() => {
    if (!isOpen) return;
    form.reset({
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      banner_content_id: profile.banner_content_id,
      banner_image_id: profile.banner_image_id,
    });
  }, [
    form,
    isOpen,
    profile.avatar_url,
    profile.banner_content_id,
    profile.banner_image_id,
    profile.bio,
  ]);

  async function submit(values: EditProfileForm) {
    let updatedProfile: PublicProfileIdentity;
    try {
      updatedProfile = await mutation.mutateAsync({
        username: profile.username,
        data: values,
      });
    } catch {
      return;
    }
    form.reset({
      bio: updatedProfile.bio,
      avatar_url: updatedProfile.avatar_url,
      banner_content_id: updatedProfile.banner_content_id,
      banner_image_id: updatedProfile.banner_image_id,
    });
    onOpenChange(false);
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className="max-h-[calc(100vh-2rem)] overflow-y-auto border-white/15 bg-[#12040f] text-white sm:max-w-2xl"
    >
      <Modal.Header
        title="Edit public profile"
        description="Update the avatar and bio people see on your public page."
      />
      <Modal.Content>
        <form
          className="grid gap-6 pt-2 sm:grid-cols-[7rem_1fr]"
          onSubmit={form.handleSubmit(submit)}
        >
          <UserAvatar
            avatarUrl={watchedAvatar}
            username={profile.username}
            alt="Avatar preview"
            className="h-28 w-28 border border-white/15 text-3xl"
          />
          <div className="space-y-5">
            <div>
              <Input
                id="profile-username"
                label="Username"
                value={profile.username}
                readOnly
                aria-describedby="username-help"
                className="min-h-11 border-white/15 bg-black/20 text-white/65"
              />
              <p id="username-help" className="mt-2 text-xs text-white/60">
                Your username is your permanent public URL.
              </p>
            </div>
            <div>
              <label
                htmlFor="profile-bio"
                className="mb-2 block text-sm font-medium"
              >
                Bio
              </label>
              <textarea
                id="profile-bio"
                rows={4}
                maxLength={280}
                className="w-full rounded-md border border-white/15 bg-black/20 px-4 py-3 text-white outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                {...form.register("bio")}
              />
              <div className="mt-1 flex justify-between gap-3 text-xs">
                <span className="text-red-400">
                  {form.formState.errors.bio?.message}
                </span>
                <span className="text-white/60">{watchedBio.length}/280</span>
              </div>
            </div>
            <Input
              label="Avatar URL"
              type="url"
              placeholder="https://example.com/avatar.jpg"
              error={form.formState.errors.avatar_url?.message}
              className="min-h-11 border-white/15 bg-black/20 text-white"
              {...form.register("avatar_url")}
            />
            <ProfileBannerPicker
              options={bannerOptions}
              contentId={watchedBannerContentId}
              imageId={watchedBannerImageId}
              onContentChange={(contentId) => {
                form.setValue("banner_content_id", contentId, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                form.setValue("banner_image_id", null, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
              onImageChange={(imageId) => {
                form.setValue("banner_image_id", imageId, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!form.formState.isDirty || mutation.isPending}
              >
                {mutation.isPending ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </div>
        </form>
      </Modal.Content>
    </Modal>
  );
}
