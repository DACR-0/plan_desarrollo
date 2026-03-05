export default function KpiCard({ title, value, subtitle, icon: Icon, color = 'blue' }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-700',   text: 'text-blue-700'   },
    green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-700', text: 'text-green-700'  },
    yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-700',text: 'text-yellow-700'},
    red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-700',     text: 'text-red-700'    },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-700',text: 'text-purple-700'},
  };
  const c = colors[color] || colors.blue;

  return (
    <div className={`card p-5 ${c.bg}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${c.text}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${c.icon}`}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  );
}
