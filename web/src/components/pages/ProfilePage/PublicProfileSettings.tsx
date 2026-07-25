import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/common/ui/Button";
import { Input } from "@/components/common/ui/Input";
import { useUpdatePublicProfileMutation } from "@/lib/api/mutations/usePublicProfileMutation";

const publicProfileSchema = z.object({
  bio: z.string().max(280, "Bio must be 280 characters or fewer."),
  avatar_url: z
    .string()
    .max(2048, "Avatar URL is too long.")
    .refine(
      (value) => !value || value.startsWith("https://"),
      "Use an HTTPS image URL.",
    ),
});

type PublicProfileForm = z.infer<typeof publicProfileSchema>;

interface PublicProfileSettingsProps {
  username: string;
  bio: string;
  avatarUrl: string;
}

export function PublicProfileSettings({
  username,
  bio,
  avatarUrl,
}: PublicProfileSettingsProps) {
  const mutation = useUpdatePublicProfileMutation();
  const form = useForm<PublicProfileForm>({
    resolver: zodResolver(publicProfileSchema),
    defaultValues: { bio, avatar_url: avatarUrl },
  });
  const watchedBio = form.watch("bio");
  const watchedAvatar = form.watch("avatar_url");

  useEffect(() => {
    form.reset({ bio, avatar_url: avatarUrl });
  }, [avatarUrl, bio, form]);

  async function submit(values: PublicProfileForm) {
    await mutation.mutateAsync({ username, data: values });
    form.reset(values);
  }

  return (
    <section aria-labelledby="public-profile-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="public-profile-heading" className="text-xl font-bold">
            Public profile
          </h2>
          <p className="mt-1 text-sm text-white/55">
            Choose what people see on your public activity page.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link
            to="/user/$username"
            params={{ username }}
            search={{ tab: "overview", page: 1 }}
          >
            View profile
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <form
        className="mt-6 grid gap-6 md:grid-cols-[7rem_1fr]"
        onSubmit={form.handleSubmit(submit)}
      >
        <AvatarPreview avatarUrl={watchedAvatar} username={username} />
        <div className="space-y-5">
          <Input
            id="profile-username"
            label="Username"
            value={username}
            readOnly
            aria-describedby="username-help"
            className="min-h-11 border-white/15 bg-black/20 text-white/65"
          />
          <p id="username-help" className="-mt-3 text-xs text-white/50">
            Your username is your permanent public URL.
          </p>
          <div>
            <label htmlFor="profile-bio" className="mb-2 block text-sm font-medium">
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
              <span className="text-white/50">{watchedBio.length}/280</span>
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
          <Button
            type="submit"
            disabled={!form.formState.isDirty || mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Save public profile"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function AvatarPreview({
  avatarUrl,
  username,
}: {
  avatarUrl: string;
  username: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [avatarUrl]);

  return (
    <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full border border-white/15 bg-[#32163a] text-3xl font-black">
      {avatarUrl && !failed ? (
        <img
          src={avatarUrl}
          alt="Avatar preview"
          width={112}
          height={112}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{username.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}
