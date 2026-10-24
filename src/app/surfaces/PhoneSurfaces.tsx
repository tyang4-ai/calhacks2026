// The three phone surfaces. Each takes what it shows as props, so the /demo stage can place them.
import { PhoneFrame } from "../../ui/PhoneFrame";
import { useSurfaceLang } from "../lang";
import { Slot } from "../Slot";

export interface PhoneSurfaceProps {
  /** Override the resolved language, for a stage that wants to force one. */
  lang?: "en" | "zh";
}

export function BuyerSurface({ lang }: PhoneSurfaceProps) {
  const resolved = useSurfaceLang("buyer");
  const l = lang ?? resolved;
  return (
    <PhoneFrame testId="frame-buyer" lang={l}>
      <Slot slot="buyer.main" surface="buyer" lang={l} />
    </PhoneFrame>
  );
}

export function OwnerSurface({ lang }: PhoneSurfaceProps) {
  const resolved = useSurfaceLang("owner");
  const l = lang ?? resolved;
  return (
    <PhoneFrame testId="frame-owner" lang={l}>
      <Slot slot="owner.main" surface="owner" lang={l} />
    </PhoneFrame>
  );
}

export interface MakerSurfaceProps extends PhoneSurfaceProps {
  /** From /maker/:makerId, and mkr_01 on /demo. */
  makerId: string;
}

export function MakerSurface({ makerId, lang }: MakerSurfaceProps) {
  const resolved = useSurfaceLang("maker");
  const l = lang ?? resolved;
  return (
    <PhoneFrame testId="frame-maker" lang={l}>
      <Slot slot="maker.main" surface="maker" lang={l} makerId={makerId} />
    </PhoneFrame>
  );
}
