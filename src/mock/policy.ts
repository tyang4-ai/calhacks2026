// The topics the Clerk reads: shipping (pol_01), returns, care, verification and commissions.
// DEMO DATA: Cindia's demo policy, in plain words. Care is plain handling for each material, with
// no claim about the crafts. pol_01's transit days are what B14's arrival_window and run_01 use,
// and its text is built from them.
import type { Policy, PolicyTopic } from "../core/types";

const TRANSIT = { transitDaysMin: 6, transitDaysMax: 10 };
const RETURN_DAYS = 30;

const shipping: PolicyTopic = {
  id: "pol_01",
  title: { en: "Shipping", zh: "配送" },
  body: {
    en: `Every community ships from its own region with tracked shipping. Each piece ships within the lead time shown on its page, then arrives ${TRANSIT.transitDaysMin} to ${TRANSIT.transitDaysMax} days after it ships.`,
    zh: `每个社区都从各自所在的地区发货，并提供物流追踪。每件作品会在其页面标注的备货期内发出，发货后${TRANSIT.transitDaysMin}到${TRANSIT.transitDaysMax}天送达。`,
  },
  data: { ...TRANSIT },
};

const returns: PolicyTopic = {
  id: "pol_02",
  title: { en: "Returns", zh: "退货" },
  body: {
    en: `A piece can be returned within ${RETURN_DAYS} days of delivery, unused and as it arrived. Cindia refunds the full price once the piece is back with its maker.`,
    zh: `作品送达后${RETURN_DAYS}天内可以退货，须未使用并保持收到时的样子。作品退回匠人手中后，Cindia全额退款。`,
  },
  data: { returnDays: RETURN_DAYS },
};

const care: PolicyTopic = {
  id: "pol_03",
  title: { en: "Care", zh: "保养" },
  body: {
    en: "Wool: hang it or lay it flat out of direct sun, and spot-clean it with cold water. Silver: wipe it with a soft dry cloth and keep it dry. Beadwork: keep it dry and store it flat. Pottery: dust it with a soft dry brush and keep it away from water. Cotton patchwork: wash it cold on a gentle cycle and hang it to dry.",
    zh: "羊毛：悬挂或平放，避免阳光直射，用冷水局部清洁。银饰：用柔软的干布擦拭，保持干燥。串珠：保持干燥，平放收纳。陶器：用柔软的干刷子除尘，避免接触水。棉质拼布：用冷水轻柔洗涤，挂起晾干。",
  },
};

const verification: PolicyTopic = {
  id: "pol_04",
  title: { en: "Verification", zh: "认证" },
  body: {
    en: "In a real launch, each maker would be an enrolled member of their nation or certified by it as an Indian artisan, as the U.S. Indian Arts and Crafts Act defines, and Cindia would keep only a yes or no, never the record. No real check was done for this demo. If a piece isn't as described, Cindia refunds it in full.",
    zh: "正式上线时，每位匠人须是其所属部族的在册成员，或经其认证为印第安手工艺人，以美国《印第安艺术和手工艺品法》的定义为准；Cindia只保存“是”或“否”，从不保存记录本身。本演示没有做任何真实核查。如果作品与描述不符，Cindia全额退款。",
  },
};

const commissions: PolicyTopic = {
  id: "pol_05",
  title: { en: "Commissions", zh: "定制" },
  body: {
    en: "A commission is paid in milestones. Cindia holds the buyer's money and pays the maker each milestone's share only after the owner approves it. Money for milestones not yet released stays with Cindia, and if a commission is canceled, that money goes back to the buyer.",
    zh: "定制作品按里程碑付款。Cindia代为保管买家的款项，每个里程碑经负责人批准后，才把该里程碑的份额付给匠人。尚未发放的款项留在Cindia；如果定制取消，这部分款项退还给买家。",
  },
};

export const policy: Policy = [shipping, returns, care, verification, commissions];
